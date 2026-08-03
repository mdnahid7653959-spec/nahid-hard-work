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
  X,
  Sliders,
  Sun,
  Moon
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
      { title: "Payments & Ledger", href: "/admin/payments", icon: PaymentsViewPermissionCheck() },
      { title: "Dynamic Commissions", href: "/admin/commissions", icon: Percent, permission: "commissions:read" },
      { title: "Shipping & Couriers", href: "/admin/shipping", icon: Truck, permission: "shipping:manage" }
    ]
  },
  {
    group: "PARTNERS & USERS",
    items: [
      { title: "User & Seller Center", href: "/admin/users", icon: Users, permission: "dashboard:view" },
      { title: "User Panel Control", href: "/admin/user-control", icon: Sliders, permission: "dashboard:view", badge: "Control" },
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

function PaymentsViewPermissionCheck(): PermissionAction {
  return "payments:view" as PermissionAction;
}

export const EnterpriseAdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { adminUser, adminRole, logout } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inactivityCountdown, setInactivityCountdown] = useState(900); // 15 minutes
  const [adminTheme, setAdminTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("admin_theme") as "light" | "dark") || "light";
  });

  const toggleTheme = () => {
    const nextTheme = adminTheme === "light" ? "dark" : "light";
    setAdminTheme(nextTheme);
    localStorage.setItem("admin_theme", nextTheme);
  };

  const isLight = adminTheme === "light";

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
    <div className={`min-h-screen flex overflow-hidden font-sans transition-colors duration-200 ${
      isLight ? "bg-slate-100 text-slate-900" : "bg-slate-950 text-slate-100"
    }`}>
      {/* SIDEBAR NAVIGATION */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 transition-all duration-300 flex flex-col ${
          sidebarOpen ? "w-64" : "w-20"
        } ${
          isLight ? "bg-white border-r border-slate-200 text-slate-800 shadow-sm" : "bg-slate-900 border-r border-slate-800 text-slate-100"
        }`}
      >
        {/* LOGO HEADER */}
        <div className={`h-16 px-4 flex items-center justify-between border-b shrink-0 ${
          isLight ? "border-slate-200 bg-white" : "border-slate-800 bg-slate-900"
        }`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-orange-600 flex items-center justify-center font-black text-white shadow-md shadow-orange-600/30">
                D
              </div>
              <div className="flex flex-col">
                <span className={`font-extrabold text-sm tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                  Durtup Enterprise
                </span>
                <span className={`text-[10px] font-semibold ${isLight ? "text-orange-600" : "text-slate-400"}`}>
                  Control Center v3.0
                </span>
              </div>
            </div>
          ) : (
            <div className="h-9 w-9 mx-auto rounded-xl bg-orange-600 flex items-center justify-center font-black text-white">
              D
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`hidden lg:flex p-1.5 rounded-lg transition ${
              isLight ? "hover:bg-slate-100 text-slate-500 hover:text-slate-800" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
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
                  <p className={`px-3 text-[10px] font-bold uppercase tracking-wider mb-2 ${
                    isLight ? "text-slate-400" : "text-slate-500"
                  }`}>
                    {group.group}
                  </p>
                )}
                {visibleItems.map((item) => {
                  const isActive = location.pathname === item.href || (item.href !== "/admin/dashboard" && location.pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? "bg-orange-600 text-white shadow-md shadow-orange-600/25"
                          : isLight
                          ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-100"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : isLight ? "text-slate-500" : "text-slate-400"}`} />
                      {sidebarOpen && (
                        <span className="flex-1 truncate">{item.title}</span>
                      )}
                      {sidebarOpen && item.badge && (
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${
                          isActive
                            ? "bg-white/20 text-white border-transparent"
                            : isLight
                            ? "border-orange-300 text-orange-600 bg-orange-50"
                            : "border-orange-500/40 text-orange-400"
                        }`}>
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
        <div className={`p-3 border-t shrink-0 ${
          isLight ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-900/60"
        }`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center font-bold text-xs text-orange-700 shrink-0">
                {adminUser?.email?.[0].toUpperCase() || "A"}
              </div>
              {sidebarOpen && (
                <div className="min-w-0">
                  <p className={`text-xs font-bold truncate ${isLight ? "text-slate-900" : "text-slate-200"}`}>
                    {adminUser?.email}
                  </p>
                  <p className="text-[10px] text-orange-600 font-bold uppercase">{adminRole || "Admin"}</p>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <button
                onClick={handleAutoLogout}
                className={`p-2 rounded-lg transition ${
                  isLight ? "text-slate-500 hover:bg-red-50 hover:text-red-600" : "text-slate-400 hover:bg-red-500/10 hover:text-red-400"
                }`}
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
        <header className={`h-16 border-b px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md ${
          isLight ? "bg-white/90 border-slate-200 text-slate-800" : "bg-slate-900/90 border-slate-800 text-slate-100"
        }`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`lg:hidden p-2 rounded-lg ${
                isLight ? "hover:bg-slate-100 text-slate-600" : "hover:bg-slate-800 text-slate-300"
              }`}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className={`flex items-center gap-2 text-xs font-semibold ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              <span>Enterprise Admin</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              <span className={`font-bold capitalize ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                {location.pathname.split("/")[2] || "Dashboard"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* THEME TOGGLE BUTTON */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className={`text-xs font-bold gap-1.5 ${
                isLight
                  ? "border-slate-300 bg-slate-50 hover:bg-slate-200 text-slate-800"
                  : "border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200"
              }`}
              title="Toggle Light/Dark Theme"
            >
              {isLight ? (
                <>
                  <Sun className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-indigo-400 fill-indigo-400" />
                  <span>Dark Mode</span>
                </>
              )}
            </Button>

            {/* INACTIVITY SESSION TIMEOUT BADGE */}
            <div className={`hidden sm:flex items-center gap-1.5 border px-3 py-1.5 rounded-full text-xs font-mono ${
              isLight ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-slate-800/80 border-slate-700/60 text-slate-300"
            }`}>
              <Clock className="h-3.5 w-3.5 text-orange-600" />
              <span className="text-[11px]">Session Timeout:</span>
              <span className="text-orange-600 font-bold">{formatSeconds(inactivityCountdown)}</span>
            </div>

            {/* SECURITY BADGE */}
            <Badge className={`px-3 py-1 text-[11px] font-bold hidden md:flex items-center gap-1.5 ${
              isLight ? "bg-emerald-50 border border-emerald-300 text-emerald-700" : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
            }`}>
              <ShieldCheck className="h-3.5 w-3.5" />
              RBAC PROTECTED
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoLogout}
              className={`text-xs font-bold gap-1.5 ${
                isLight
                  ? "border-slate-300 bg-slate-50 hover:bg-red-50 hover:text-red-600 text-slate-700"
                  : "border-slate-700 bg-slate-800 hover:bg-red-950 hover:text-red-400 text-slate-200"
              }`}
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </header>

        {/* CONTENT CONTAINER */}
        <main className={`flex-1 p-4 sm:p-6 overflow-y-auto ${
          isLight ? "bg-slate-50 text-slate-900" : "bg-slate-950 text-slate-100"
        }`}>
          {children}
        </main>
      </div>
    </div>
  );
};

