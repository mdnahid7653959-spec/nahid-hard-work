import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Heart, User, Menu, X, ChevronDown, Truck, HelpCircle, Package, Store, ChevronRight, LogOut, Home, Zap, Smartphone, Shirt, Home as HomeIcon, Dumbbell, Gamepad2, Sparkles, Car, Gem, LucideIcon, MessageCircle, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSiteConfig } from "@/hooks/useSiteConfig";

interface CategoryItem {
  name: string;
  Icon: LucideIcon;
  gradient: string;
  subcategories: string[];
}

const defaultCategories: CategoryItem[] = [{
  name: "Electronics", Icon: Smartphone, gradient: "from-blue-500 to-cyan-400",
  subcategories: ["Smartphones", "Laptops", "Tablets", "Cameras", "Headphones"]
}, {
  name: "Fashion", Icon: Shirt, gradient: "from-pink-500 to-rose-400",
  subcategories: ["Men's Clothing", "Women's Clothing", "Shoes", "Bags", "Accessories"]
}, {
  name: "Home & Garden", Icon: HomeIcon, gradient: "from-green-500 to-emerald-400",
  subcategories: ["Furniture", "Kitchen", "Bedding", "Decor", "Garden Tools"]
}, {
  name: "Sports", Icon: Dumbbell, gradient: "from-orange-500 to-amber-400",
  subcategories: ["Fitness", "Outdoor", "Team Sports", "Water Sports", "Cycling"]
}, {
  name: "Toys & Hobbies", Icon: Gamepad2, gradient: "from-purple-500 to-violet-400",
  subcategories: ["Video Games", "Board Games", "Puzzles", "Drones", "RC Toys"]
}, {
  name: "Beauty & Health", Icon: Sparkles, gradient: "from-pink-400 to-fuchsia-400",
  subcategories: ["Skincare", "Makeup", "Hair Care", "Fragrances", "Personal Care"]
}, {
  name: "Automotive", Icon: Car, gradient: "from-slate-500 to-zinc-400",
  subcategories: ["Car Electronics", "Accessories", "Tools", "Parts", "Motorcycle"]
}, {
  name: "Jewelry", Icon: Gem, gradient: "from-amber-400 to-yellow-300",
  subcategories: ["Rings", "Necklaces", "Earrings", "Bracelets", "Watches"]
}];

const defaultTrendingSearches = ["Wireless earbuds", "Phone cases", "Smart watch", "LED lights", "Summer dress"];

interface TopBarConfig { text: string; visible: boolean; }
interface NavLinkConfig { label: string; href: string; highlight?: boolean; color?: string; }

interface HeaderConfig {
  logo_url: string;
  logo_text: string;
  show_search: boolean;
  show_categories_bar: boolean;
  top_bar: TopBarConfig;
  nav_links: NavLinkConfig[];
  trending_searches: string[];
}

const defaultHeaderConfig: HeaderConfig = {
  logo_url: "/lovable-uploads/f37448fb-4b8d-40a2-9709-70766997626f.jpg",
  logo_text: "Darzo",
  show_search: true,
  show_categories_bar: true,
  top_bar: { text: "Free Shipping on ৳999+", visible: true },
  nav_links: [
    { label: "Home", href: "/", highlight: false },
    { label: "⚡ Flash Sale", href: "/flash-sale", highlight: true, color: "sale" },
    { label: "New Arrivals", href: "/new-arrivals", highlight: true, color: "success" },
    { label: "Free Shipping", href: "/free-shipping", highlight: false },
  ],
  trending_searches: defaultTrendingSearches,
};

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCategories, setShowCategories] = useState(false);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { itemCount: cartCount } = useCart();
  const { itemCount: wishlistCount } = useWishlist();
  const { toast } = useToast();
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  const { config: headerConfig } = useSiteConfig<HeaderConfig>("header", defaultHeaderConfig);

  const logoUrl = headerConfig.logo_url || defaultHeaderConfig.logo_url;
  const showSearch = headerConfig.show_search !== false;
  const showCategoriesBar = headerConfig.show_categories_bar !== false;
  const topBar = headerConfig.top_bar || defaultHeaderConfig.top_bar;
  const navLinks = headerConfig.nav_links?.length ? headerConfig.nav_links : defaultHeaderConfig.nav_links;
  const trendingSearches = headerConfig.trending_searches?.length ? headerConfig.trending_searches : defaultTrendingSearches;

  useEffect(() => {
    if (!user) { setHasUnreadMessages(false); return; }

    const checkUnread = async () => {
      const { data: buyerConvs } = await supabase
        .from("conversations").select("buyer_unread_count")
        .eq("buyer_id", user.id).gt("buyer_unread_count", 0).limit(1);

      if (buyerConvs && buyerConvs.length > 0) { setHasUnreadMessages(true); return; }

      const { data: sellerData } = await supabase
        .from("sellers").select("id")
        .eq("user_id", user.id).eq("status", "approved").limit(1);

      if (sellerData && sellerData.length > 0) {
        const { data: sellerConvs } = await supabase
          .from("conversations").select("seller_unread_count")
          .eq("seller_id", sellerData[0].id).gt("seller_unread_count", 0).limit(1);
        if (sellerConvs && sellerConvs.length > 0) { setHasUnreadMessages(true); return; }
      }
      setHasUnreadMessages(false);
    };

    checkUnread();
    const channel = supabase
      .channel("unread-messages-indicator")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => checkUnread())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations" }, () => checkUnread())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut();
      toast({ title: "Logged out", description: "You've been successfully logged out." });
      navigate("/");
    } catch (error) { console.error("Logout error:", error); }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
  };

  const categories = defaultCategories;

  return (
    <header className="sticky top-0 z-50 w-full shadow-lg" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>

      {/* Main header */}
      <div className="bg-primary text-primary-foreground">
        <div className="container py-1.5 sm:py-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <button className="lg:hidden p-1.5 hover:bg-white/10 rounded-md transition-colors" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>

            <Link to="/" className="flex items-center gap-2 shrink-0">
              <img alt="Darzo.com" className="h-6 sm:h-7 w-auto object-contain rounded-md" src={logoUrl} />
            </Link>

            {/* Categories dropdown for desktop */}
            <div className="hidden lg:block relative">
              <button
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all font-medium text-sm"
                onMouseEnter={() => setShowCategories(true)}
                onMouseLeave={() => setShowCategories(false)}
              >
                <Menu className="h-4 w-4" /> All Categories <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {showCategories && (
                <div
                  className="absolute top-full left-0 mt-1 bg-card text-foreground rounded-xl shadow-2xl overflow-hidden flex z-50"
                  onMouseEnter={() => setShowCategories(true)}
                  onMouseLeave={() => { setShowCategories(false); setActiveCategory(null); }}
                >
                  <div className="w-64 border-r py-2">
                    {categories.map((cat, idx) => (
                      <Link
                        key={cat.name}
                        to={`/category/${cat.name.toLowerCase().replace(/ & /g, '-')}`}
                        className={`group flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition-all duration-200 ${activeCategory === idx ? 'bg-primary/10 border-l-2 border-primary' : 'border-l-2 border-transparent'}`}
                        onMouseEnter={() => setActiveCategory(idx)}
                      >
                        <span className={`text-sm font-semibold tracking-wide transition-colors ${activeCategory === idx ? 'text-primary' : 'text-foreground/80 group-hover:text-foreground'}`}>
                          {cat.name}
                        </span>
                        <ChevronRight className={`h-4 w-4 ml-auto transition-all duration-200 ${activeCategory === idx ? 'text-primary translate-x-0.5' : 'opacity-40'}`} />
                      </Link>
                    ))}
                  </div>
                  {activeCategory !== null && (
                    <div className="w-64 p-4 bg-muted/50">
                      <h4 className="font-semibold text-sm mb-3 text-foreground">{categories[activeCategory].name}</h4>
                      <div className="space-y-2">
                        {categories[activeCategory].subcategories.map((sub) => (
                          <Link key={sub} to={`/category/${categories[activeCategory].name.toLowerCase().replace(/ & /g, '-')}?sub=${sub.toLowerCase()}`} className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                            {sub}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Search bar */}
            {showSearch && (
              <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden md:flex">
                <div className="relative w-full flex">
                  <Input type="search" placeholder="Search for products, brands and more..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="rounded-r-none border-0 bg-white text-foreground placeholder:text-muted-foreground h-8 text-xs pr-16 focus-visible:ring-0 focus-visible:ring-offset-0" />
                  <Button type="submit" className="rounded-l-none h-8 px-3 bg-warning hover:bg-warning/90 text-warning-foreground font-medium text-xs">
                    <Search className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </form>
            )}

            {/* Actions */}
            <div className="flex items-center gap-0.5 sm:gap-1 ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 flex flex-col items-center h-auto py-1 px-1.5 sm:px-2 rounded-md">
                    <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="text-[8px] sm:text-[9px] leading-none mt-0.5 font-medium">
                      {user ? profile?.full_name?.split(' ')[0] || 'Account' : 'Account'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover">
                  {user ? (
                    <>
                      <div className="p-3 border-b">
                        <p className="text-sm font-medium">{profile?.full_name || 'Welcome!'}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <DropdownMenuItem asChild><Link to="/orders" className="cursor-pointer">My Orders</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link to="/wishlist" className="cursor-pointer">Wishlist</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link to="/account" className="cursor-pointer">Account Settings</Link></DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                        <LogOut className="h-4 w-4 mr-2" /> Logout
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <div className="p-3 border-b">
                        <p className="text-sm font-medium">Welcome to Darzo.com!</p>
                        <div className="flex gap-2 mt-2">
                          <Button asChild size="sm" className="flex-1"><Link to="/login">Sign In</Link></Button>
                          <Button asChild variant="outline" size="sm" className="flex-1"><Link to="/register">Register</Link></Button>
                        </div>
                      </div>
                      <DropdownMenuItem asChild><Link to="/orders" className="cursor-pointer">My Orders</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link to="/wishlist" className="cursor-pointer">Wishlist</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link to="/account" className="cursor-pointer">Account Settings</Link></DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Link to="/messages">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 flex flex-col items-center h-auto py-1 px-1.5 sm:px-2 rounded-md relative">
                  <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-[8px] sm:text-[9px] leading-none mt-0.5 font-medium">Messages</span>
                  {hasUnreadMessages && <span className="absolute top-0 right-0.5 h-2 w-2 rounded-full bg-green-400 border border-primary animate-pulse" />}
                </Button>
              </Link>

              <Link to="/wishlist">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 flex flex-col items-center h-auto py-1 px-1.5 sm:px-2 rounded-md relative">
                  <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-[8px] sm:text-[9px] leading-none mt-0.5 font-medium">Wishlist</span>
                  {wishlistCount > 0 && <span className="absolute -top-0.5 right-0 h-3.5 w-3.5 rounded-full bg-warning text-[8px] font-bold text-warning-foreground flex items-center justify-center">{wishlistCount > 99 ? "99+" : wishlistCount}</span>}
                </Button>
              </Link>

              <Link to="/cart" className="hidden sm:block">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 flex flex-col items-center h-auto py-1 px-1.5 sm:px-2 rounded-md relative">
                  <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-[8px] sm:text-[9px] leading-none mt-0.5 font-medium">Cart</span>
                  {cartCount > 0 && <span className="absolute -top-0.5 right-0 h-3.5 w-3.5 rounded-full bg-warning text-[8px] font-bold text-warning-foreground flex items-center justify-center">{cartCount > 99 ? "99+" : cartCount}</span>}
                </Button>
              </Link>
            </div>
          </div>

          {/* Mobile search */}
          {showSearch && (
            <form onSubmit={handleSearch} className="mt-1.5 md:hidden">
              <div className="relative w-full flex">
                <Input type="search" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-r-none border-0 bg-white text-foreground text-xs pr-8 h-8 focus-visible:ring-0" />
                <Button type="submit" className="rounded-l-none h-8 w-9 bg-warning hover:bg-warning/90" size="icon">
                  <Search className="h-3.5 w-3.5" />
                </Button>
              </div>
            </form>
          )}

          {/* Trending searches - desktop */}
          <div className="hidden md:flex items-center gap-3 mt-2 text-xs text-white/70">
            <span className="font-medium">Trending:</span>
            {trendingSearches.map((term, i) => (
              <button key={term} onClick={() => { setSearchQuery(term); navigate(`/products?search=${encodeURIComponent(term)}`); }} className="hover:text-white transition-colors">
                {term}{i < trendingSearches.length - 1 && <span className="ml-2 text-white/30">•</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Categories nav - desktop */}
      {showCategoriesBar && (
        <nav className="border-t border-white/5 bg-card hidden lg:block shadow-sm">
          <div className="container">
            <ul className="flex items-center gap-1 py-1.5 text-sm overflow-x-auto">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className={`px-3 py-1.5 font-bold hover:bg-primary/10 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 text-[13px] ${
                      link.color === 'sale' ? 'text-sale hover:bg-sale/10' :
                      link.color === 'success' ? 'text-success hover:bg-success/10' :
                      'text-primary'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {categories.slice(0, 6).map((category) => (
                <li key={category.name}>
                  <Link to={`/category/${category.name.toLowerCase().replace(/ & /g, '-')}`} className="px-3 py-1.5 text-foreground/70 hover:text-primary font-medium hover:bg-primary/5 rounded-lg transition-all whitespace-nowrap text-[13px]">
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      )}

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="lg:hidden border-t glass-strong animate-slide-down max-h-[70vh] overflow-y-auto overscroll-contain scrollbar-hide">
          <nav className="container py-3 px-3">
            <div className="space-y-1">
              <Link to="/" className="flex items-center gap-3 py-3 px-4 rounded-xl bg-primary/10 text-primary font-bold touch-manipulation press-scale" onClick={() => setIsMenuOpen(false)}>
                <Home className="h-5 w-5" /> Home
              </Link>
              <Link to="/flash-sale" className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-muted active:bg-muted/80 transition-colors text-sale font-bold touch-manipulation press-scale" onClick={() => setIsMenuOpen(false)}>
                <Zap className="h-5 w-5" /> Flash Sale
              </Link>
              <Link to="/products" className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-muted active:bg-muted/80 transition-colors font-semibold touch-manipulation press-scale" onClick={() => setIsMenuOpen(false)}>
                <Package className="h-5 w-5" /> All Products
              </Link>

              <div className="border-t my-2"></div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold px-4 py-1.5">Categories</p>

              <div className="grid grid-cols-2 gap-1.5">
                {categories.map((category) => (
                  <Link key={category.name} to={`/category/${category.name.toLowerCase().replace(/ & /g, '-')}`}
                    className="group flex items-center gap-2.5 py-3 px-3 rounded-xl hover:bg-gradient-to-r hover:from-primary/10 hover:to-transparent active:bg-muted/80 transition-all duration-300 touch-manipulation press-scale border border-transparent hover:border-primary/20"
                    onClick={() => setIsMenuOpen(false)}>
                    <span className="font-semibold text-xs text-foreground/80 group-hover:text-foreground group-hover:translate-x-0.5 transition-all duration-300 truncate">
                      {category.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
