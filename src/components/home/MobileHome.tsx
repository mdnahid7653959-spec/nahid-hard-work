import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search, Camera, Mic, MessageCircle, Bell, ShoppingCart, MapPin, ChevronDown,
  Zap, Truck, Ticket, Percent, Star, LayoutGrid, Package, Video, Crown, MoreHorizontal,
  ArrowRight, Heart,
} from "lucide-react";
import { useHomeProducts } from "@/hooks/useHomeProducts";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";
import type { Product } from "@/components/products/ProductCard";

function useCountdown(seconds: number) {
  const [t, setT] = useState(seconds);
  useEffect(() => {
    const i = setInterval(() => setT((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(i);
  }, []);
  const h = String(Math.floor(t / 3600)).padStart(2, "0");
  const m = String(Math.floor((t % 3600) / 60)).padStart(2, "0");
  const s = String(t % 60).padStart(2, "0");
  return { h, m, s };
}

const quickActions = [
  { label: "Flash Sale", Icon: Zap, href: "/products?filter=flash-sale" },
  { label: "Free Shipping", Icon: Truck, href: "/products?filter=free-shipping" },
  { label: "Coupons", Icon: Ticket, href: "/my-vouchers" },
  { label: "Top Deals", Icon: Percent, href: "/products?filter=featured" },
  { label: "New Arrivals", Icon: Star, href: "/products?filter=new" },
  { label: "Categories", Icon: LayoutGrid, href: "/categories" },
  { label: "Orders", Icon: Package, href: "/orders" },
  { label: "Live Shopping", Icon: Video, href: "/products?sort=trending" },
  { label: "Durtup Club", Icon: Crown, href: "/account" },
  { label: "More", Icon: MoreHorizontal, href: "/categories" },
];

function FlashCard({ p }: { p: Product }) {
  const discount = p.originalPrice ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
  const sold = p.sold || 0;
  const bar = Math.min(100, Math.max(15, sold % 100));
  return (
    <Link
      to={`/product/${p.slug}`}
      className="flex-shrink-0 w-[150px] rounded-2xl bg-card border border-border/60 overflow-hidden shadow-sm active:scale-[0.98] transition-transform"
    >
      <div className="relative aspect-square bg-muted">
        <img src={p.image} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[11px] font-bold px-2 py-0.5 rounded-md shadow">
            -{discount}%
          </span>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-[13px] font-medium text-foreground truncate">{p.name}</p>
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="text-primary font-bold text-sm">৳{p.price.toLocaleString()}</span>
          {p.originalPrice && (
            <span className="text-[11px] text-muted-foreground line-through">৳{p.originalPrice.toLocaleString()}</span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">{sold} sold</p>
        <div className="mt-1.5 h-1 rounded-full bg-primary/15 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-orange-400" style={{ width: `${bar}%` }} />
        </div>
      </div>
    </Link>
  );
}

function RecommendCard({ p }: { p: Product }) {
  return (
    <Link
      to={`/product/${p.slug}`}
      className="flex-shrink-0 w-[145px] rounded-2xl bg-card border border-border/60 overflow-hidden shadow-sm active:scale-[0.98] transition-transform"
    >
      <div className="relative aspect-square bg-muted">
        <img src={p.image} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
        <button
          onClick={(e) => { e.preventDefault(); }}
          aria-label="wishlist"
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/90 backdrop-blur flex items-center justify-center shadow-sm"
        >
          <Heart className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
      <div className="p-2.5">
        <p className="text-[13px] font-medium text-foreground truncate">{p.name}</p>
        <p className="text-primary font-bold text-sm mt-1">৳{p.price.toLocaleString()}</p>
        <div className="flex items-center gap-1 mt-1">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span className="text-[11px] text-muted-foreground">
            {(p.rating || 4.5).toFixed(1)} ({p.reviews || 0})
          </span>
        </div>
      </div>
    </Link>
  );
}

export function MobileHome() {
  const navigate = useNavigate();
  const { data, isLoading } = useHomeProducts();
  const { itemCount } = useCart();
  const { h, m, s } = useCountdown(2 * 3600 + 45 * 60 + 9);

  const flash = data?.flashSale?.length ? data.flashSale : data?.trending || [];
  const recommend = data?.recommended?.length ? data.recommended : data?.latestProducts || [];

  return (
    <div className="md:hidden bg-background min-h-screen pb-24">
      {/* Header */}
      <header
        className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/40"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
              <Crown className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-extrabold tracking-tight">
              DUR<span className="text-primary">TUP</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/messages" className="relative">
              <MessageCircle className="h-6 w-6 text-foreground" />
            </Link>
            <Link to="/notifications" className="relative">
              <Bell className="h-6 w-6 text-foreground" />
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                3
              </span>
            </Link>
            <Link to="/cart" className="relative">
              <ShoppingCart className="h-6 w-6 text-foreground" />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = (e.currentTarget.elements.namedItem("q") as HTMLInputElement)?.value;
              if (v) navigate(`/search?q=${encodeURIComponent(v)}`);
            }}
            className="flex items-center gap-2 h-11 rounded-full bg-muted/60 border border-border/50 px-4"
          >
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              name="q"
              placeholder="Search for products, brands and more..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
            <button type="button" aria-label="camera" className="text-muted-foreground">
              <Camera className="h-4 w-4" />
            </button>
            <div className="h-4 w-px bg-border" />
            <button type="button" aria-label="voice" className="text-muted-foreground">
              <Mic className="h-4 w-4" />
            </button>
          </form>
        </div>
      </header>

      <div className="px-4 pt-3 space-y-4">
        {/* Deliver to */}
        <button className="flex items-center gap-1.5 text-sm">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">Deliver to</span>
          <span className="font-semibold text-primary">Banani, Dhaka</span>
          <ChevronDown className="h-3.5 w-3.5 text-primary" />
        </button>

        {/* Hero Sale Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-100 via-orange-50 to-amber-100 p-5 min-h-[210px]">
          <div className="relative z-10 max-w-[58%]">
            <span className="inline-block bg-orange-200/70 text-orange-900 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md">
              Mega Deal
            </span>
            <h2 className="mt-2 text-[26px] leading-[1.05] font-extrabold text-foreground">
              <span className="text-primary block">Summer</span>
              Super Sale
            </h2>
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-tight">
              Up to 80% Off on<br />Best Selling Products
            </p>
            <button
              onClick={() => navigate("/products?filter=flash-sale")}
              className="mt-3 inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold pl-4 pr-3 py-2 rounded-full shadow-md active:scale-95 transition-transform"
            >
              Shop Now <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          {/* Decorative circle */}
          <div className="absolute right-4 top-4 w-16 h-16 rounded-full bg-orange-50 border-2 border-orange-200 flex flex-col items-center justify-center shadow-inner">
            <span className="text-[8px] font-semibold text-orange-800 tracking-wide">UP TO</span>
            <span className="text-primary font-extrabold text-base leading-none">80%</span>
            <span className="text-[8px] font-semibold text-orange-800">OFF</span>
          </div>
          {/* Product illustration silhouettes */}
          <div className="absolute -right-2 bottom-0 w-[52%] h-[75%] pointer-events-none opacity-90">
            <div className="absolute right-3 bottom-3 w-16 h-24 rounded-t-3xl rounded-b-lg bg-gradient-to-br from-stone-200 to-stone-300 shadow-lg" />
            <div className="absolute right-16 bottom-2 w-20 h-16 rounded-2xl bg-gradient-to-br from-stone-100 to-stone-200 shadow-lg rotate-[-8deg]" />
            <div className="absolute right-24 bottom-1 w-10 h-10 rounded-full bg-gradient-to-br from-stone-900 to-stone-700 shadow-lg" />
          </div>
          {/* Pagination dots */}
          <div className="absolute bottom-3 left-5 flex gap-1">
            <span className="h-1.5 w-4 rounded-full bg-primary" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary/30" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary/30" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary/30" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-3xl bg-card border border-border/60 p-4 shadow-sm">
          <div className="grid grid-cols-5 gap-y-4 gap-x-1">
            {quickActions.map(({ label, Icon, href }) => (
              <Link key={label} to={href} className="flex flex-col items-center gap-1.5 active:opacity-70">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" strokeWidth={2.2} />
                </div>
                <span className="text-[10.5px] font-medium text-foreground text-center leading-tight">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Flash Sale */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-extrabold">Flash Sale</h3>
              <div className="flex items-center gap-0.5 bg-orange-50 px-2 py-1 rounded-md">
                <span className="text-primary font-bold text-xs tabular-nums">{h}</span>
                <span className="text-primary text-xs">:</span>
                <span className="text-primary font-bold text-xs tabular-nums">{m}</span>
                <span className="text-primary text-xs">:</span>
                <span className="text-primary font-bold text-xs tabular-nums">{s}</span>
              </div>
            </div>
            <Link to="/products?filter=flash-sale" className="text-xs text-muted-foreground flex items-center gap-0.5">
              See All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2">
            {isLoading
              ? [...Array(4)].map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[150px] h-[240px] rounded-2xl bg-muted animate-pulse" />
                ))
              : flash.slice(0, 8).map((p) => <FlashCard key={p.id} p={p} />)}
          </div>
        </section>

        {/* Recommended */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-extrabold">Recommended For You</h3>
            <Link to="/products" className="text-xs text-muted-foreground flex items-center gap-0.5">
              See All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2">
            {isLoading
              ? [...Array(4)].map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[145px] h-[220px] rounded-2xl bg-muted animate-pulse" />
                ))
              : recommend.slice(0, 10).map((p) => <RecommendCard key={p.id} p={p} />)}
          </div>
        </section>

        {/* Durtup Club Promo */}
        <Link
          to="/account"
          className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 p-3 shadow-sm active:scale-[0.99] transition-transform"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm shrink-0">
            <Crown className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm">Durtup Club</span>
              <span className="text-[10px] font-semibold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                Premium
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              Unlock exclusive benefits and save more!
            </p>
          </div>
          <button className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-full inline-flex items-center gap-1 shrink-0">
            Join Now <ArrowRight className="h-3 w-3" />
          </button>
        </Link>
      </div>
    </div>
  );
}

export default MobileHome;
