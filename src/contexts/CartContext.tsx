import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  variant_id?: string | null;
  product: {
    id: string;
    name: string;
    slug: string;
    regular_price: number;
    discount_price: number | null;
    stock_quantity: number;
  };
  image?: string;
}

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  itemCount: number;
  subtotal: number;
  addToCart: (productId: string, quantity?: number, variants?: Record<string, string>) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "megamart_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Get local cart for non-logged-in users
  const getLocalCart = useCallback(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }, []);

  const setLocalCart = useCallback((cart: any[]) => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, []);

  // Fetch cart from database or local storage
  const fetchCart = useCallback(async () => {
    setLoading(true);
    
    if (user) {
      // Fetch from database for logged-in users
      const { data, error } = await supabase
        .from("cart_items")
        .select(`
          id,
          product_id,
          quantity,
          variant_id,
          product:products(id, name, slug, regular_price, discount_price, stock_quantity, product_images(image_url, sort_order))
        `)
        .eq("user_id", user.id);

      if (!error && data) {
        const cartItems = data.map((item: any) => {
          const product = Array.isArray(item.product) ? item.product[0] : item.product;
          const imgs = product?.product_images || [];
          const sorted = [...imgs].sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
          return {
            ...item,
            product,
            image: sorted[0]?.image_url,
          };
        }).filter((item: any) => item.product);

        setItems(cartItems);
      }
    } else {
      // Use local storage for guests
      const localCart = getLocalCart();
      if (localCart.length > 0) {
        const productIds = localCart.map((item: any) => item.product_id);
        const { data: products } = await supabase
          .from("products")
          .select("id, name, slug, regular_price, discount_price, stock_quantity, product_images(image_url, sort_order)")
          .in("id", productIds);

        if (products) {
          const cartItems = localCart.map((item: any) => {
            const product: any = products.find((p: any) => p.id === item.product_id);
            const imgs = product?.product_images || [];
            const sorted = [...imgs].sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
            return {
              id: item.id || `local-${item.product_id}`,
              product_id: item.product_id,
              quantity: item.quantity,
              variant_id: item.variant_id,
              product,
              image: sorted[0]?.image_url,
            };
          }).filter((item: any) => item.product);

          setItems(cartItems);
        }
      } else {
        setItems([]);
      }
    }

    
    setLoading(false);
  }, [user, getLocalCart]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Merge local cart to database when user logs in
  useEffect(() => {
    const mergeLocalCart = async () => {
      if (!user) return;
      
      const localCart = getLocalCart();
      if (localCart.length === 0) return;

      for (const item of localCart) {
        await supabase.from("cart_items").upsert({
          user_id: user.id,
          product_id: item.product_id,
          quantity: item.quantity
        }, {
          onConflict: "user_id,product_id"
        });
      }

      localStorage.removeItem(CART_STORAGE_KEY);
      fetchCart();
    };

    mergeLocalCart();
  }, [user, getLocalCart, fetchCart]);

  const addToCart = useCallback(async (productId: string, quantity: number = 1, variants?: Record<string, string>) => {
    const variantStr = variants ? JSON.stringify(variants) : null;
    
    if (user) {
      // Check if already in cart with same variants
      const existing = items.find(item => item.product_id === productId && (item as any).variant_id === variantStr);
      
      if (existing) {
        await updateQuantity(existing.id, existing.quantity + quantity);
      } else {
        const { error } = await supabase.from("cart_items").insert({
          user_id: user.id,
          product_id: productId,
          quantity,
          variant_id: variantStr
        });

        if (error) {
          toast({ variant: "destructive", title: "Error", description: "Failed to add to cart" });
          return;
        }
      }
    } else {
      // Local cart for guests
      const localCart = getLocalCart();
      const existing = localCart.find((item: any) => item.product_id === productId && item.variant_id === variantStr);
      
      if (existing) {
        existing.quantity += quantity;
      } else {
        localCart.push({ product_id: productId, quantity, variant_id: variantStr, id: `local-${Date.now()}` });
      }
      
      setLocalCart(localCart);
    }
    
    await fetchCart();
    toast({ title: "Added to cart", description: "Item has been added to your cart" });
  }, [user, items, fetchCart, getLocalCart, setLocalCart, toast]);

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    
    if (user) {
      const { error } = await supabase
        .from("cart_items")
        .update({ quantity })
        .eq("id", itemId);

      if (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to update quantity" });
        return;
      }
    } else {
      const localCart = getLocalCart();
      const item = localCart.find((i: any) => i.id === itemId);
      if (item) {
        item.quantity = quantity;
        setLocalCart(localCart);
      }
    }
    
    await fetchCart();
  }, [user, fetchCart, getLocalCart, setLocalCart, toast]);

  const removeItem = useCallback(async (itemId: string) => {
    if (user) {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", itemId);

      if (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to remove item" });
        return;
      }
    } else {
      const localCart = getLocalCart().filter((i: any) => i.id !== itemId);
      setLocalCart(localCart);
    }
    
    await fetchCart();
    toast({ title: "Item removed", description: "Item has been removed from your cart" });
  }, [user, fetchCart, getLocalCart, setLocalCart, toast]);

  const clearCart = useCallback(async () => {
    if (user) {
      await supabase.from("cart_items").delete().eq("user_id", user.id);
    } else {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
    setItems([]);
  }, [user]);

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  
  const subtotal = useMemo(() => items.reduce((sum, item) => {
    const price = item.product.discount_price || item.product.regular_price;
    return sum + price * item.quantity;
  }, 0), [items]);

  const value = useMemo(() => ({
    items,
    loading,
    itemCount,
    subtotal,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    refreshCart: fetchCart
  }), [items, loading, itemCount, subtotal, addToCart, updateQuantity, removeItem, clearCart, fetchCart]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
