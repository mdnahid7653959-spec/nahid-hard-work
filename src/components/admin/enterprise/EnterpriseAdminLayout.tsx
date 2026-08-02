import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { AdminRBACService, PermissionAction } from "@/services/admin/security/AdminRBACService";
import { AdminAuditLogService } from "@/services/admin/security/AdminAuditLogService";
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  CreditCard,
  Percent,
  Truck,
  Users,
  Building2,
  Plug,
  Sparkles,
  Palette,
  Megaphone,
  ShieldCheck,
  LogOut,
  ChevronRight,
  ShieldAlert,
  Search,
  Bell,
  Clock,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: PermissionAction;
  badge?: string;
}

const NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: "OVERVIEW",
    items: [
      { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, permission: "dashboard:view" }
    ]
  },
  {
    group: "COMMERCE",
    items: [
      { title: "Products Catalog", href: "/admin/products", icon: Package, permission: "products:read" },
      { title: "Inventory & Warehouses", href: "/admin/inventory", icon: Boxes, permission: "inventory:view" },
      { title: "Orders Pipeline", href: "/admin/orders", icon: ShoppingCart, permission: "orders:read" },
      { title: "Payments & Ledger", href: "/admin/payments", icon: CreditCard, permission: "payments:view" },
      { title: "Dynamic Commissions", href: "/admin/commissions", icon: Percent, permission: "commissions:read" },
      { title: "Shipping & Couriers", href: "/admin/shipping", icon: Truck, permission: "shipping:manage" }
    ]
  },
  {
    group: "PARTNERS & USERS",
    items: [
      { title: "User & Seller Center", href: "/admin/users", icon: Users, permission: "dashboard:view" },
      { title: "Supplier API Center", href: "/admin/suppliers", icon: Plug, permission: "suppliers:read", badge: "API" }
    ]
  },
  {
    group: "MARKETING & CMS",
    items: [
      { title: "Visual CMS Builder", href: "/admin/cms-builder", icon: Palette, permission: "cms:builder", badge: "Live" },
      { title: "Campaigns & Coupons", href: "/admin/campaigns", icon: Megaphone, permission: "campaigns:manage" }
    ]
  },
  {
    group: "INTELLIGENCE & SECURITY",
    items: [
      { title: "Enterprise AI Studio", href: "/admin/ai-studio", icon: Sparkles, permission: "ai_studio:access", badge: "AI" },
      { title: "Security & Audit Trail", href: "/admin/security", icon: ShieldCheck, permission: "security:view_logs" }
    ]
  }
];

export const EnterpriseAdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { adminUser, adminRole, logout } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inactivityCountdown, setInactivityCountdown] = useState(900); // 15 minutes (900 seconds)

  // Inactivity timeout handler
  useEffect(() => {
    const timer = setInterval(() => {
      setInactivityCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const resetInactivity = () => setInactivityCountdown(900);
    window.addEventListener("mousemove", resetInactivity);
    window.addEventListener("keydown", resetInactivity);

    return () => {
      clearInterval(timer);
      window.removeEventListener("mousemove", resetInactivity);
      window.removeEventListener("keydown", resetInactivity);
    };
  }, []);

  const handleAutoLogout = async () => {
    if (adminUser) {
      await AdminAuditLogService.logAction({
        adminId: adminUser.uid,
        adminEmail: adminUser.email || "",
        adminRole: adminRole || "Admin",
        action: "AUTO_LOGOUT_INACTIVITY",
        module: "SECURITY",
        details: "Automatic logout due to 15 minutes of inactivity",
        status: "SUCCESS"
      });
    }
    await logout();
    navigate("/admin/login");
  };

  const formatSeconds = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex overflow-hidden font-sans">
      {/* SIDEBAR NAVIGATION */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col ${
          sidebarOpen ? "w-64" : "w-20"
        }`}
      >
        {/* LOGO HEADER */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          {sidebarOpen ? (
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-orange-600 flex items-center justify-center font-black text-white shadow-lg shadow-orange-600/30">
                D
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-sm tracking-tight text-white">Durtup Enterprise</span>
                <span className="text-[10px] text-slate-400 font-medium">Control Center v3.0</span>
              </div>
            </div>
          ) : (
            <div className="h-9 w-9 mx-auto rounded-xl bg-orange-600 flex items-center justify-center font-black text-white">
              D
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* NAVIGATION LINKS */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter((item) =>
              AdminRBACService.hasPermission(adminRole as any, item.permission)
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={group.group} className="space-y-1">
                {sidebarOpen && (
                  <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                    {group.group}
                  </p>
                )}
                {visibleItems.map((item) => {
                  const isActive = location.pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-orange-600 text-white shadow-md shadow-orange-600/20"
                          : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-100"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                      {sidebarOpen && (
                        <span className="flex-1 truncate">{item.title}</span>
                      )}
                      {sidebarOpen && item.badge && (
                        <Badge variant="outline" className="text-[9px] border-orange-500/40 text-orange-400 px-1.5 py-0">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* USER FOOTER */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/60 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-orange-400 shrink-0">
                {adminUser?.email?.[0].toUpperCase() || "A"}
              </div>
              {sidebarOpen && (
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-200 truncate">{adminUser?.email}</p>
                  <p className="text-[10px] text-orange-400 font-semibold uppercase">{adminRole || "Admin"}</p>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <button
                onClick={handleAutoLogout}
                className="p-2 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-20"}`}>
        {/* HEADER BAR */}
        <header className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-800 text-slate-300"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <span>Enterprise Admin</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
              <span className="text-slate-100 font-bold capitalize">
                {location.pathname.split("/")[2] || "Dashboard"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* INACTIVITY SESSION TIMEOUT BADGE */}
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-full text-xs font-mono">
              <Clock className="h-3.5 w-3.5 text-orange-400" />
              <span className="text-slate-300 text-[11px]">Session Timeout:</span>
              <span className="text-orange-400 font-bold">{formatSeconds(inactivityCountdown)}</span>
            </div>

            {/* SECURITY BADGE */}
            <Badge className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1 text-[11px] font-bold hidden md:flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              RBAC PROTECTED
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoLogout}
              className="border-slate-700 bg-slate-800 hover:bg-red-950 hover:text-red-400 text-slate-200 text-xs font-bold gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </header>

        {/* CONTENT CONTAINER */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
};
