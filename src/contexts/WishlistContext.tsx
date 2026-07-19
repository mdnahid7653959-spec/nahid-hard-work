import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface WishlistItem {
  id: string;
  product_id: string;
  product: {
    id: string;
    name: string;
    slug: string;
    regular_price: number;
    discount_price: number | null;
  };
  image?: string;
}

interface WishlistContextType {
  items: WishlistItem[];
  loading: boolean;
  itemCount: number;
  isInWishlist: (productId: string) => boolean;
  addToWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const WISHLIST_STORAGE_KEY = "megamart_wishlist";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const getLocalWishlist = useCallback(() => {
    const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }, []);

  const setLocalWishlist = useCallback((wishlist: any[]) => {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
  }, []);

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    
    if (user) {
      const { data, error } = await supabase
        .from("wishlist")
        .select(`
          id,
          product_id,
          product:products(id, name, slug, regular_price, discount_price)
        `)
        .eq("user_id", user.id);

      if (!error && data) {
        const images = [
          "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200&h=200&fit=crop",
          "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=200&h=200&fit=crop",
        ];
        
        const wishlistItems = data.map((item: any, i: number) => ({
          ...item,
          product: Array.isArray(item.product) ? item.product[0] : item.product,
          image: images[i % images.length]
        })).filter((item: any) => item.product);
        
        setItems(wishlistItems);
      }
    } else {
      const localWishlist = getLocalWishlist();
      if (localWishlist.length > 0) {
        const { data: products } = await supabase
          .from("products")
          .select("id, name, slug, regular_price, discount_price")
          .in("id", localWishlist);

        if (products) {
          const images = [
            "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200&h=200&fit=crop",
            "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=200&h=200&fit=crop",
          ];
          
          const wishlistItems = products.map((p: any, i: number) => ({
            id: `local-${p.id}`,
            product_id: p.id,
            product: p,
            image: images[i % images.length]
          }));
          
          setItems(wishlistItems);
        }
      } else {
        setItems([]);
      }
    }
    
    setLoading(false);
  }, [user, getLocalWishlist]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const isInWishlist = useCallback((productId: string) => {
    return items.some(item => item.product_id === productId);
  }, [items]);

  const addToWishlist = useCallback(async (productId: string) => {
    if (user) {
      const { error } = await supabase.from("wishlist").insert({
        user_id: user.id,
        product_id: productId
      });

      if (error) {
        if (error.code === "23505") {
          toast({ title: "Already in wishlist" });
          return;
        }
        toast({ variant: "destructive", title: "Error", description: "Failed to add to wishlist" });
        return;
      }
    } else {
      const localWishlist = getLocalWishlist();
      if (!localWishlist.includes(productId)) {
        localWishlist.push(productId);
        setLocalWishlist(localWishlist);
      }
    }
    
    await fetchWishlist();
    toast({ title: "Added to wishlist" });
  }, [user, fetchWishlist, getLocalWishlist, setLocalWishlist, toast]);

  const removeFromWishlist = useCallback(async (productId: string) => {
    if (user) {
      const { error } = await supabase
        .from("wishlist")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", productId);

      if (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to remove from wishlist" });
        return;
      }
    } else {
      const localWishlist = getLocalWishlist().filter((id: string) => id !== productId);
      setLocalWishlist(localWishlist);
    }
    
    await fetchWishlist();
    toast({ title: "Removed from wishlist" });
  }, [user, fetchWishlist, getLocalWishlist, setLocalWishlist, toast]);

  const toggleWishlist = useCallback(async (productId: string) => {
    if (isInWishlist(productId)) {
      await removeFromWishlist(productId);
    } else {
      await addToWishlist(productId);
    }
  }, [isInWishlist, addToWishlist, removeFromWishlist]);

  const itemCount = useMemo(() => items.length, [items]);

  const value = useMemo(() => ({
    items,
    loading,
    itemCount,
    isInWishlist,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist
  }), [items, loading, itemCount, isInWishlist, addToWishlist, removeFromWishlist, toggleWishlist]);

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
