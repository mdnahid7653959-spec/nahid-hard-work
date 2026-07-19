import { Link, useLocation } from "react-router-dom";
import { Home, LayoutGrid, ShoppingCart, Package, User, Heart, Search, Bell, Store, LucideIcon } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";
import { useSiteConfig } from "@/hooks/useSiteConfig";

const iconMap: Record<string, LucideIcon> = {
  home: Home,
  grid: LayoutGrid,
  "layout-grid": LayoutGrid,
  "shopping-cart": ShoppingCart,
  cart: ShoppingCart,
  package: Package,
  orders: Package,
  user: User,
  account: User,
  heart: Heart,
  wishlist: Heart,
  search: Search,
  bell: Bell,
  store: Store,
};

interface NavTab {
  label: string;
  icon: string;
  href: string;
  badge?: string;
}

const defaultTabs: NavTab[] = [
  { label: "Home", icon: "home", href: "/" },
  { label: "Categories", icon: "grid", href: "/categories" },
  { label: "Cart", icon: "shopping-cart", href: "/cart", badge: "cart" },
  { label: "Orders", icon: "package", href: "/orders" },
  { label: "Account", icon: "user", href: "/account" },
];

interface MobileNavConfig {
  tabs: NavTab[];
}

export function MobileBottomNav() {
  const location = useLocation();
  const { itemCount: cartCount } = useCart();
  const { config } = useSiteConfig<MobileNavConfig>("mobile_nav", { tabs: defaultTabs });

  const tabs = config.tabs?.length ? config.tabs : defaultTabs;

  const getBadgeCount = (badge?: string) => {
    if (badge === "cart") return cartCount;
    return 0;
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/98 backdrop-blur-lg border-t shadow-[0_-2px_20px_rgba(0,0,0,0.08)]" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
      <div className={`grid h-[60px]`} style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.href || 
            (tab.href !== "/" && location.pathname.startsWith(tab.href));
          const badgeCount = getBadgeCount(tab.badge);
          const IconComp = iconMap[tab.icon] || Home;

          return (
            <Link
              key={tab.label}
              to={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 relative touch-manipulation",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-b bg-primary" />
              )}
              
              <div className="relative">
                <IconComp className={cn(
                  "h-5 w-5 transition-colors",
                  isActive && "stroke-[2.5]"
                )} />
                
                {badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1 shadow border-2 border-card">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </div>
              
              <span className={cn(
                "text-[10px] leading-none",
                isActive ? "font-semibold" : "font-medium"
              )}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
