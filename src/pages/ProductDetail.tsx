import { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Heart, ShoppingCart, Star, Shield, RotateCcw, Minus, Plus, Loader2, Play, ChevronLeft, ChevronRight, Share2, Zap, MessageSquare, ShieldCheck, Store, Truck, Award, Sparkles, TrendingUp, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useToast } from "@/hooks/use-toast";
import { useProductRealtimeSync } from "@/hooks/useRealtimeSync";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { RelatedProducts } from "@/components/products/RelatedProducts";
import { ProductReviews } from "@/components/products/ProductReviews";
import { StoreDetails } from "@/components/products/StoreDetails";

interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean | null;
  sort_order: number | null;
}
interface Product {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  regular_price: number;
  discount_price: number | null;
  stock_quantity: number;
  free_shipping: boolean;
  rating_average: number;
  rating_count: number;
  sold_count: number;
  is_featured: boolean;
  warranty_info: string | null;
  return_policy: string | null;
  color?: string | null;
  video_url?: string | null;
  product_images?: ProductImage[];
  category_id?: string | null;
  brand_id?: string | null;
  tags?: string[] | null;
  seller_id?: string | null;
}
const defaultImages = ["https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&h=600&fit=crop&sat=-100"];
const getYouTubeEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
};

function MobileProductTopBar() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  return (
    <div className="md:hidden sticky top-0 z-40 bg-primary text-primary-foreground shadow-sm" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex items-center gap-2 px-2 py-1.5">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-white/10 rounded-md" aria-label="Back">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) navigate(`/products?search=${encodeURIComponent(q)}`); }} className="flex-1">
          <input type="search" placeholder="Search products..." value={q} onChange={(e) => setQ(e.target.value)}
            className="w-full h-8 rounded-md px-3 text-xs text-foreground bg-white placeholder:text-muted-foreground focus:outline-none" />
        </form>
        <Link to="/wishlist" className="p-1.5 hover:bg-white/10 rounded-md" aria-label="Wishlist">
          <Heart className="h-5 w-5" />
        </Link>
        <Link to="/cart" className="p-1.5 hover:bg-white/10 rounded-md" aria-label="Cart">
          <ShoppingCart className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}



function InlineStoreBar({ sellerId, onContactSeller, contactingSeller }: {
  sellerId: string;
  onContactSeller: () => void;
  contactingSeller: boolean;
}) {
  const { data: store, isLoading } = useQuery({
    queryKey: ["inline-store", sellerId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("resolve_product_seller", {
        _product_seller_id: sellerId,
      });

      if (error) {
        console.error("Inline store resolve error:", error);
        return null;
      }

      return Array.isArray(data) ? data[0] : data;
    },
    enabled: !!sellerId,
  });

  if (isLoading) {
    return <div className="h-16 mt-4 rounded-xl bg-muted animate-pulse" />;
  }

  const storeName = store?.shop_name || "Darzo Official";

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border mt-4">
      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
        {store?.shop_logo ? (
          <img src={store.shop_logo} alt={storeName} className="w-full h-full object-cover" />
        ) : (
          <Store className="h-5 w-5 text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground truncate">{storeName}</span>
          {(store?.is_featured ?? true) && <ShieldCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
        </div>
        {store?.rating_average != null ? (
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-warning text-warning" />
            <span className="text-xs text-muted-foreground">
              {Number(store.rating_average).toFixed(1)} ({store.rating_count || 0})
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Trusted marketplace seller</span>
        )}
      </div>
      <Button size="sm" variant="outline" className="gap-1.5 flex-shrink-0" onClick={onContactSeller} disabled={contactingSeller}>
        {contactingSeller ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">Chat</span>
      </Button>
    </div>
  );
}

export default function ProductDetail() {
  const {
    slug
  } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const {
    addToCart
  } = useCart();
  const {
    isInWishlist,
    toggleWishlist
  } = useWishlist();
  const {
    toast
  } = useToast();
  const {
    trackView
  } = useRecentlyViewed();
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Enable real-time sync for this product
  useProductRealtimeSync(product?.id);

  // Get images from product or use defaults
  const images = product?.product_images && product.product_images.length > 0 ? product.product_images.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(img => img.image_url) : defaultImages;

  // Touch swipe handling for images
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      // Swipe left
      const totalImages = (product as any)?.video_url ? images.length + 1 : images.length;
      setSelectedImage(prev => Math.min(prev + 1, totalImages - 1));
      setShowVideo(selectedImage === images.length - 1 && (product as any)?.video_url);
    }
    if (touchEnd - touchStart > 75) {
      // Swipe right
      setSelectedImage(prev => Math.max(prev - 1, 0));
      setShowVideo(false);
    }
  };
  useEffect(() => {
    async function fetchProduct() {
      if (!slug) return;
      const {
        data,
        error
      } = await supabase.from("products").select(`
          *,
          product_images (
            id,
            image_url,
            is_primary,
            sort_order
          )
        `).eq("slug", slug).single();
      if (error) {
        console.error("Error fetching product:", error);
      } else {
        setProduct(data);
        // Track product view
        if (data?.id) {
          trackView(data.id);
        }
      }
      setLoading(false);
    }
    fetchProduct();
  }, [slug, trackView]);
  const handleAddToCart = async () => {
    if (!product) return;
    setAddingToCart(true);
    await addToCart(product.id, quantity);
    setAddingToCart(false);
  };
  const handleBuyNow = async () => {
    if (!product) return;
    setBuyingNow(true);
    await addToCart(product.id, quantity);
    setBuyingNow(false);
    navigate("/checkout");
  };
  const handleWishlistToggle = () => {
    if (!product) return;
    toggleWishlist(product.id);
  };
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name,
          url: window.location.href
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied!",
        description: "Product link copied to clipboard"
      });
    }
  };

  const { user: authUser } = useAuth();
  const [contactingSeller, setContactingSeller] = useState(false);

  const handleContactSeller = async () => {
    if (!authUser) {
      toast({ title: "Please login", description: "You need to login to message a seller", variant: "destructive" });
      navigate("/login");
      return;
    }
    if (!product?.seller_id) {
      toast({ title: "Cannot contact seller", description: "Seller info not available", variant: "destructive" });
      return;
    }
    setContactingSeller(true);
    try {
      const { data: resolvedSellerData, error: resolveError } = await supabase.rpc("resolve_product_seller", {
        _product_seller_id: product.seller_id,
      });

      if (resolveError) throw resolveError;

      const sellerRecord = Array.isArray(resolvedSellerData)
        ? resolvedSellerData[0]
        : resolvedSellerData;

      if (!sellerRecord?.seller_id) {
        toast({ title: "Seller not found", variant: "destructive" });
        setContactingSeller(false);
        return;
      }

      // Check if conversation already exists
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("buyer_id", authUser.id)
        .eq("seller_id", sellerRecord.seller_id)
        .eq("product_id", product.id)
        .single();

      if (existing) {
        navigate(`/messages/${existing.id}`);
      } else {
        const { data: newConv, error } = await supabase
          .from("conversations")
          .insert({
            buyer_id: authUser.id,
            seller_id: sellerRecord.seller_id,
            product_id: product.id,
          })
          .select("id")
          .single();

        if (error) throw error;
        navigate(`/messages/${newConv.id}`);
      }
    } catch (err) {
      console.error("Error contacting seller:", err);
      toast({ title: "Error", description: "Could not start conversation", variant: "destructive" });
    }
    setContactingSeller(false);
  };

  const inWishlist = product ? isInWishlist(product.id) : false;
  if (loading) {
    return <div className="min-h-screen flex flex-col bg-background">
        <div className="hidden md:block"><Header /></div>
        <MobileProductTopBar />
        <main className="flex-1 container py-4 sm:py-8 pb-20 md:pb-8">
          <div className="animate-pulse">
            <div className="grid md:grid-cols-2 gap-4 sm:gap-8">
              <div className="aspect-square bg-muted rounded-xl" />
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-12 bg-muted rounded w-1/3" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
        <MobileBottomNav />
      </div>;
  }
  if (!product) {
    return <div className="min-h-screen flex flex-col bg-background">
        <div className="hidden md:block"><Header /></div>
        <MobileProductTopBar />
        <main className="flex-1 container py-8 pb-20 md:pb-8">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold text-foreground mb-4">Product Not Found</h1>
            <p className="text-muted-foreground mb-6">The product you're looking for doesn't exist.</p>
            <Link to="/">
              <Button size="lg">Back to Home</Button>
            </Link>
          </div>
        </main>
        <Footer />
        <MobileBottomNav />
      </div>;
  }
  const price = product.discount_price || product.regular_price;
  const discount = product.discount_price ? Math.round((1 - product.discount_price / product.regular_price) * 100) : 0;
  return <div className="min-h-screen flex flex-col bg-background">
      <div className="hidden md:block"><Header /></div>
      <MobileProductTopBar />

      <main className="flex-1 pb-40 md:pb-8">
        <div className="container py-4 sm:py-8">
          {/* Breadcrumb - Hidden on mobile */}
          <nav className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link to="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <Link to="/products" className="hover:text-primary">Products</Link>
            <span>/</span>
            <span className="text-foreground line-clamp-1">{product.name}</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
            {/* Product Images Section */}
            <div className="w-full">
              {/* Main Image with premium gradient frame */}
              <div className="flex justify-center mb-4">
                <div className="relative w-full max-w-[320px] sm:max-w-[400px] lg:max-w-[480px]">
                  {/* Decorative glow */}
                  <div className="absolute -inset-1 bg-gradient-to-tr from-primary/30 via-warning/20 to-primary/30 rounded-3xl blur-xl opacity-60 pointer-events-none" />
                  <div ref={imageContainerRef} className="relative aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-white via-muted/30 to-primary/5 border border-primary/10 shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.35)]" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    {/* Corner accents */}
                    <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-primary/30 rounded-tl-3xl pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-primary/30 rounded-br-3xl pointer-events-none" />

                    {showVideo && product.video_url ? getYouTubeEmbedUrl(product.video_url) ? <iframe src={getYouTubeEmbedUrl(product.video_url) || ''} title="Product Video" className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : <video src={product.video_url} controls className="w-full h-full object-contain object-center bg-black/5" playsInline /> : <img src={images[selectedImage]} alt={product.name} className="w-full h-full object-contain object-center p-4 transition-transform duration-500 hover:scale-105" />}

                    {/* Featured badge */}
                    {product.is_featured && (
                      <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-warning to-primary text-white text-xs font-bold shadow-md">
                        <Sparkles className="h-3 w-3" />
                        FEATURED
                      </div>
                    )}

                    {/* Image navigation arrows */}
                    <button onClick={() => {
                      setSelectedImage(Math.max(0, selectedImage - 1));
                      setShowVideo(false);
                    }} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 backdrop-blur shadow-lg flex items-center justify-center opacity-0 sm:opacity-100 hover:bg-primary hover:text-white hover:scale-110 transition-all" disabled={selectedImage === 0}>
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button onClick={() => {
                      const totalImages = (product as any)?.video_url ? images.length : images.length - 1;
                      if (selectedImage < totalImages) {
                        setSelectedImage(selectedImage + 1);
                        if (selectedImage === images.length - 1 && (product as any)?.video_url) {
                          setShowVideo(true);
                        }
                      }
                    }} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 backdrop-blur shadow-lg flex items-center justify-center opacity-0 sm:opacity-100 hover:bg-primary hover:text-white hover:scale-110 transition-all">
                      <ChevronRight className="h-5 w-5" />
                    </button>

                    {/* Share button */}
                    <button onClick={handleShare} className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/95 backdrop-blur shadow-lg flex items-center justify-center hover:bg-primary hover:text-white hover:scale-110 transition-all">
                      <Share2 className="h-5 w-5" />
                    </button>

                    {/* Image indicator dots */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 sm:hidden">
                      {images.map((_, i) => (
                        <div key={i} className={`h-2 rounded-full transition-all ${selectedImage === i && !showVideo ? 'bg-primary w-6' : 'bg-white/70 w-2'}`} />
                      ))}
                      {product.video_url && <div className={`h-2 rounded-full transition-all ${showVideo ? 'bg-primary w-6' : 'bg-white/70 w-2'}`} />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Thumbnail strip */}
              <div className="flex gap-2 sm:gap-3 justify-start sm:justify-center flex-wrap pl-2 sm:px-2">
                {images.map((img, i) => (
                  <button key={i} onClick={() => {
                    setSelectedImage(i);
                    setShowVideo(false);
                  }} className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 transition-all flex-shrink-0 hover:scale-105 ${selectedImage === i && !showVideo ? 'border-primary ring-2 ring-primary/40 shadow-lg shadow-primary/20' : 'border-muted hover:border-primary/50'}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
                {/* Video thumbnail */}
                {product.video_url && (
                  <button onClick={() => setShowVideo(true)} className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 transition-all flex items-center justify-center bg-muted flex-shrink-0 relative hover:scale-105 ${showVideo ? 'border-primary ring-2 ring-primary/40 shadow-lg' : 'border-muted hover:border-primary/50'}`}>
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                      <Play className="h-6 w-6 sm:h-8 sm:w-8 text-white fill-white" />
                    </div>
                    {getYouTubeEmbedUrl(product.video_url) ? <img src={`https://img.youtube.com/vi/${product.video_url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1]}/mqdefault.jpg`} alt="Video thumbnail" className="w-full h-full object-cover" /> : <video src={product.video_url} className="w-full h-full object-cover" muted playsInline />}
                  </button>
                )}
              </div>
            </div>


            {/* Product Info */}
            <div className="space-y-5 sm:space-y-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {product.is_featured && (
                    <Badge className="bg-gradient-to-r from-warning to-primary text-white border-0 gap-1">
                      <Sparkles className="h-3 w-3" /> Best Seller
                    </Badge>
                  )}
                  {product.sold_count > 100 && (
                    <Badge variant="outline" className="border-primary/30 text-primary gap-1">
                      <TrendingUp className="h-3 w-3" /> Trending
                    </Badge>
                  )}
                  <Badge variant="outline" className="border-success/30 text-success gap-1">
                    <ShieldCheck className="h-3 w-3" /> Authentic
                  </Badge>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3 leading-tight tracking-tight">
                  {product.name}
                </h1>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm">
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-warning/10">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    <span className="text-foreground font-semibold">
                      {product.rating_average.toFixed(1)}
                    </span>
                    <span className="text-muted-foreground">
                      ({product.rating_count})
                    </span>
                  </div>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Package className="h-3.5 w-3.5" />
                    {product.sold_count.toLocaleString()} sold
                  </span>
                </div>
              </div>

              {/* Premium price card */}
              <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-primary/10 via-warning/5 to-primary/5 border border-primary/20">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                <div className="relative flex items-baseline gap-3 flex-wrap">
                  <span className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-primary to-warning bg-clip-text text-transparent">
                    ৳{price.toLocaleString()}
                  </span>
                  {discount > 0 && (
                    <>
                      <span className="text-lg sm:text-xl text-muted-foreground line-through">
                        ৳{product.regular_price.toLocaleString()}
                      </span>
                      <Badge variant="destructive" className="bg-sale text-base font-bold">-{discount}%</Badge>
                    </>
                  )}
                </div>
                {discount > 0 && (
                  <p className="relative mt-2 text-sm text-success font-medium flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    You save ৳{(product.regular_price - price).toLocaleString()}
                  </p>
                )}
                {product.free_shipping && (
                  <div className="relative mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    <Truck className="h-3.5 w-3.5" /> Free Shipping
                  </div>
                )}
              </div>

              {/* Product Color */}
              {(product as any).color && <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Color:</span>
                  <div className="w-8 h-8 rounded-full border-2 border-border shadow-sm" style={{
                backgroundColor: (product as any).color
              }} title={(product as any).color} />
                  <span className="text-sm text-muted-foreground">{(product as any).color}</span>
                </div>}

              {/* Quantity & Add to Cart */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">Quantity:</span>
                  {product.stock_quantity > 1 ? (
                    <>
                      <div className="flex items-center border-2 border-primary/20 rounded-xl overflow-hidden bg-background">
                        <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} className="p-3 hover:bg-primary hover:text-white transition-colors touch-manipulation disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit">
                          <Minus className="h-5 w-5" />
                        </button>
                        <span className="px-6 font-bold text-lg">{quantity}</span>
                        <button onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))} disabled={quantity >= product.stock_quantity} className="p-3 hover:bg-primary hover:text-white transition-colors touch-manipulation disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit">
                          <Plus className="h-5 w-5" />
                        </button>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {product.stock_quantity} available
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-success">
                      Only 1 left in stock
                    </span>
                  )}
                </div>

                {/* Contact Seller Button */}
                {product.seller_id && (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={handleContactSeller}
                    disabled={contactingSeller}
                  >
                    {contactingSeller ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                    Contact Seller
                  </Button>
                )}

                {/* Desktop buttons */}
                <div className="hidden sm:flex gap-3">
                  <Button size="lg" variant="outline" className="flex-1 h-14 text-lg border-2 border-primary/30 hover:border-primary hover:bg-primary/5" onClick={handleAddToCart} disabled={addingToCart}>
                    {addingToCart ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <ShoppingCart className="h-5 w-5 mr-2" />}
                    Add to Cart
                  </Button>
                  <Button size="lg" className="flex-1 h-14 text-lg bg-gradient-to-r from-primary to-warning hover:opacity-90 shadow-lg shadow-primary/30" onClick={handleBuyNow} disabled={buyingNow}>
                    {buyingNow ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Zap className="h-5 w-5 mr-2" />}
                    Buy Now
                  </Button>
                  <Button size="lg" variant={inWishlist ? "default" : "outline"} className="h-14 w-14" onClick={handleWishlistToggle}>
                    <Heart className={`h-6 w-6 ${inWishlist ? "fill-current" : ""}`} />
                  </Button>
                </div>
              </div>

              {/* Trust badges - 4 icons */}
              <div className="grid grid-cols-4 gap-2 sm:gap-3 pt-4 border-t">
                <div className="flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-xl bg-muted/40 hover:bg-primary/5 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-center">Secure Pay</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-xl bg-muted/40 hover:bg-primary/5 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <RotateCcw className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-center">Easy Return</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-xl bg-muted/40 hover:bg-primary/5 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Truck className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-center">Fast Delivery</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-xl bg-muted/40 hover:bg-primary/5 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Award className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-center">Warranty</span>
                </div>
              </div>


              {/* Inline Store Info + Chat */}
              {product.seller_id ? (
                <InlineStoreBar 
                  sellerId={product.seller_id}
                  onContactSeller={handleContactSeller}
                  contactingSeller={contactingSeller}
                />
              ) : (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border mt-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <Store className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground">Darzo Official</span>
                      <ShieldCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    </div>
                    <span className="text-xs text-muted-foreground">Official Store</span>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1.5 flex-shrink-0" onClick={handleContactSeller} disabled={contactingSeller}>
                    {contactingSeller ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">Chat</span>
                  </Button>
                </div>
              )}

              {/* Description */}
              {product.description && <div className="pt-4 border-t">
                  <h3 className="font-bold text-lg text-foreground mb-3 flex items-center gap-2">
                    <span className="w-1 h-5 bg-gradient-to-b from-primary to-warning rounded-full" />
                    Description
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">{product.description}</p>
                </div>}

            </div>
          </div>

          {/* Store Details & Reviews - Professional Layout */}
          <div className="grid lg:grid-cols-3 gap-6 mt-8">
            {/* Reviews - Takes 2 columns */}
            <div className="lg:col-span-2 order-2 lg:order-1">
              <ProductReviews
                productId={product.id}
                ratingAverage={product.rating_average}
                ratingCount={product.rating_count}
              />
            </div>
            {/* Store Details - Sticky sidebar */}
            <div className="order-1 lg:order-2">
              <div className="lg:sticky lg:top-24 space-y-4">
                {product.seller_id ? (
                  <StoreDetails
                    sellerId={product.seller_id}
                    onContactSeller={handleContactSeller}
                    contactingSeller={contactingSeller}
                  />
                ) : (
                  <div className="bg-card rounded-2xl border p-4 sm:p-6">
                    <h3 className="text-lg font-bold text-foreground mb-4">Store Information</h3>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center flex-shrink-0">
                        <Store className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground text-base">Darzo Official</h4>
                          <ShieldCheck className="h-4 w-4 text-primary flex-shrink-0" />
                        </div>
                        <p className="text-xs text-muted-foreground">Official Store</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center p-3 bg-muted/50 rounded-xl">
                        <Star className="h-4 w-4 mx-auto text-warning mb-1" />
                        <p className="text-sm font-semibold text-foreground">5.0</p>
                        <p className="text-xs text-muted-foreground">Rating</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-xl">
                        <Shield className="h-4 w-4 mx-auto text-primary mb-1" />
                        <p className="text-sm font-semibold text-foreground">100%</p>
                        <p className="text-xs text-muted-foreground">Authentic</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-xl">
                        <RotateCcw className="h-4 w-4 mx-auto text-primary mb-1" />
                        <p className="text-sm font-semibold text-foreground">Easy</p>
                        <p className="text-xs text-muted-foreground">Returns</p>
                      </div>
                    </div>
                    <Button className="w-full gap-2" onClick={handleContactSeller} disabled={contactingSeller}>
                      {contactingSeller ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                      Chat with Store
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Related Products - Full width below product grid */}
          <RelatedProducts 
            product={{
              id: product.id,
              name: product.name,
              category_id: product.category_id,
              brand_id: product.brand_id,
              regular_price: product.regular_price,
              discount_price: product.discount_price,
              tags: product.tags,
            }}
            title="You May Also Like"
            subtitle="Similar products based on your interests"
            limit={12}
          />
        </div>

        {/* Mobile sticky bottom bar */}
        <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 bg-card border-t p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
          <div className="flex items-center gap-2">
            <Button variant={inWishlist ? "default" : "outline"} size="lg" className="h-12 w-12 shrink-0" onClick={handleWishlistToggle}>
              <Heart className={`h-5 w-5 ${inWishlist ? "fill-current" : ""}`} />
            </Button>
            <Button variant="outline" size="lg" className="flex-1 h-12 text-sm font-semibold" onClick={handleAddToCart} disabled={addingToCart}>
              {addingToCart ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ShoppingCart className="h-4 w-4 mr-1" />}
              Cart
            </Button>
            <Button size="lg" className="flex-1 h-12 text-sm font-semibold" onClick={handleBuyNow} disabled={buyingNow}>
              {buyingNow ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
              Buy Now
            </Button>
          </div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>;
}