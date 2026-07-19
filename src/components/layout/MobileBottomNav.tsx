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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border/60" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 4px)' }}>
      <div className={`grid h-[44px]`} style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.href || 
            (tab.href !== "/" && location.pathname.startsWith(tab.href));
          const badgeCount = getBadgeCount(tab.badge);
          const IconComp = iconMap[tab.icon] || Home;

          return (
            <Link
              key={tab.label}
              to={tab.href}
              aria-label={tab.label}
              className={cn(
                "flex items-center justify-center relative touch-manipulation",
                isActive ? "text-primary" : "text-muted-foreground/70"
              )}
            >
              <div className="relative">
                <IconComp className={cn(
                  "h-[18px] w-[18px] transition-colors",
                  isActive && "stroke-[2.5]"
                )} />
                
                {badgeCount > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-0.5">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

