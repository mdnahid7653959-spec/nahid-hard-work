import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Package, ShoppingCart, Users, DollarSign, TrendingUp, TrendingDown,
  ArrowUpRight, RefreshCw, Clock, AlertTriangle, Store, Star,
  MessageSquare, Command as CommandIcon, Bell, Sparkles, Search,
  FileText, Palette, Tag, Truck, Percent, Layers, Megaphone, Gift,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { useAdminCacheInvalidation } from "@/hooks/useRealtimeSync";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, subDays, startOfDay, format } from "date-fns";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

interface KPI {
  todayRevenue: number;
  yesterdayRevenue: number;
  todayOrders: number;
  yesterdayOrders: number;
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalUsers: number;
  totalSellers: number;
  newUsersToday: number;
  newUsersYesterday: number;
}

interface Alert {
  id: string;
  label: string;
  count: number;
  href: string;
  tone: "danger" | "warning" | "info";
  icon: React.ComponentType<{ className?: string }>;
}

interface RecentOrder {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
}

interface TopProduct {
  id: string;
  name: string;
  sold: number;
  revenue: number;
}

const statusColors: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  processing: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  shipped: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  delivered: "bg-success/15 text-success border-success/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

// Command palette routes — every admin page reachable via ⌘K
const COMMAND_ROUTES: { label: string; href: string; group: string; icon: any }[] = [
  { label: "Dashboard", href: "/admin", group: "Navigate", icon: TrendingUp },
  { label: "Users", href: "/admin/users", group: "Navigate", icon: Users },
  { label: "Sellers", href: "/admin/sellers", group: "Navigate", icon: Store },
  { label: "Products", href: "/admin/products", group: "Navigate", icon: Package },
  { label: "Categories", href: "/admin/categories", group: "Navigate", icon: Layers },
  { label: "Brands", href: "/admin/brands", group: "Navigate", icon: Tag },
  { label: "Orders", href: "/admin/orders", group: "Navigate", icon: ShoppingCart },
  { label: "Inventory", href: "/admin/inventory", group: "Navigate", icon: Package },
  { label: "Reviews", href: "/admin/reviews", group: "Navigate", icon: Star },
  { label: "Coupons", href: "/admin/coupons", group: "Navigate", icon: Percent },
  { label: "Commissions", href: "/admin/commissions", group: "Navigate", icon: DollarSign },
  { label: "Shipping", href: "/admin/shipping", group: "Navigate", icon: Truck },
  { label: "Free Delivery Rules", href: "/admin/free-delivery", group: "Navigate", icon: Truck },
  { label: "Consignments", href: "/admin/consignments", group: "Navigate", icon: Package },
  { label: "Marketing Campaigns", href: "/admin/marketing", group: "Navigate", icon: Megaphone },
  { label: "Push Notifications", href: "/admin/push-notifications", group: "Navigate", icon: Bell },
  { label: "Loyalty Program", href: "/admin/loyalty", group: "Navigate", icon: Gift },
  { label: "CMS Pages", href: "/admin/cms", group: "Navigate", icon: FileText },
  { label: "Theme Builder", href: "/admin/theme-builder", group: "Navigate", icon: Palette },
  { label: "Reports", href: "/admin/reports", group: "Navigate", icon: TrendingUp },
  { label: "Security", href: "/admin/security", group: "Navigate", icon: AlertTriangle },
  { label: "Settings", href: "/admin/settings", group: "Navigate", icon: CommandIcon },
  { label: "CJ Integration", href: "/admin/cj-settings", group: "Navigate", icon: Layers },
  // Actions
  { label: "Add New Product", href: "/admin/products/new", group: "Quick Actions", icon: Package },
  { label: "Create Coupon", href: "/admin/coupons", group: "Quick Actions", icon: Percent },
  { label: "Approve Sellers", href: "/admin/sellers", group: "Quick Actions", icon: Store },
  { label: "Review Pending Orders", href: "/admin/orders", group: "Quick Actions", icon: ShoppingCart },
];

const currency = (n: number) => `৳${Number(n || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;

function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const pct = previous === 0 ? 100 : ((current - previous) / previous) * 100;
  const up = pct >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${up ? "text-success" : "text-destructive"}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(pct).toFixed(1)}% vs yesterday
    </span>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { invalidateAll } = useAdminCacheInvalidation();

  const [kpi, setKpi] = useState<KPI>({
    todayRevenue: 0, yesterdayRevenue: 0, todayOrders: 0, yesterdayOrders: 0,
    totalRevenue: 0, totalOrders: 0, totalProducts: 0, totalUsers: 0,
    totalSellers: 0, newUsersToday: 0, newUsersYesterday: 0,
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [chartData, setChartData] = useState<{ date: string; revenue: number; orders: number }[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  // ⌘K / Ctrl+K to open palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const fetchAll = async () => {
    try {
      const now = new Date();
      const todayStart = startOfDay(now).toISOString();
      const yesterdayStart = startOfDay(subDays(now, 1)).toISOString();
      const last30 = subDays(now, 30).toISOString();

      const [
        productsCount, ordersAll, usersCount, sellersCount,
        pendingOrders, lowStock, pendingSellers, pendingReviews,
        recentOrdersRes, topProductsRes, newUsersToday, newUsersYesterday,
      ] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("total, status, created_at").gte("created_at", last30),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("sellers").select("id", { count: "exact", head: true }).eq("approval_status", "approved"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("products").select("id", { count: "exact", head: true }).lt("stock_quantity", 10),
        supabase.from("sellers").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("is_approved", false),
        supabase.from("orders").select("id, order_number, total, status, created_at").order("created_at", { ascending: false }).limit(6),
        supabase.from("order_items").select("product_id, product_name, quantity, total").limit(500),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", yesterdayStart).lt("created_at", todayStart),
      ]);

      const ordersData = ordersAll.data || [];
      const todayOrders = ordersData.filter((o) => o.created_at >= todayStart);
      const yesterdayOrders = ordersData.filter((o) => o.created_at >= yesterdayStart && o.created_at < todayStart);

      const sum = (arr: any[]) => arr.reduce((s, o) => s + Number(o.total || 0), 0);

      setKpi({
        todayRevenue: sum(todayOrders),
        yesterdayRevenue: sum(yesterdayOrders),
        todayOrders: todayOrders.length,
        yesterdayOrders: yesterdayOrders.length,
        totalRevenue: sum(ordersData),
        totalOrders: ordersData.length,
        totalProducts: productsCount.count || 0,
        totalUsers: usersCount.count || 0,
        totalSellers: sellersCount.count || 0,
        newUsersToday: newUsersToday.count || 0,
        newUsersYesterday: newUsersYesterday.count || 0,
      });

      // Build 7-day chart
      const buckets: Record<string, { revenue: number; orders: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = format(subDays(now, i), "MMM d");
        buckets[d] = { revenue: 0, orders: 0 };
      }
      ordersData.forEach((o) => {
        const key = format(new Date(o.created_at), "MMM d");
        if (buckets[key]) {
          buckets[key].revenue += Number(o.total || 0);
          buckets[key].orders += 1;
        }
      });
      setChartData(Object.entries(buckets).map(([date, v]) => ({ date, ...v })));

      // Alerts
      const alertList: Alert[] = [];
      if ((pendingSellers.count || 0) > 0) alertList.push({
        id: "ps", label: "Seller applications pending", count: pendingSellers.count!,
        href: "/admin/sellers", tone: "warning", icon: Store,
      });
      if ((pendingOrders.count || 0) > 0) alertList.push({
        id: "po", label: "Orders awaiting processing", count: pendingOrders.count!,
        href: "/admin/orders", tone: "info", icon: ShoppingCart,
      });
      if ((lowStock.count || 0) > 0) alertList.push({
        id: "ls", label: "Products low on stock", count: lowStock.count!,
        href: "/admin/inventory", tone: "danger", icon: AlertTriangle,
      });
      if ((pendingReviews.count || 0) > 0) alertList.push({
        id: "pr", label: "Reviews awaiting moderation", count: pendingReviews.count!,
        href: "/admin/reviews", tone: "info", icon: MessageSquare,
      });
      setAlerts(alertList);

      setRecentOrders(recentOrdersRes.data || []);

      // Top products by revenue (aggregated in-memory)
      const agg: Record<string, TopProduct> = {};
      (topProductsRes.data || []).forEach((it: any) => {
        const key = it.product_id || it.product_name;
        if (!agg[key]) agg[key] = { id: key, name: it.product_name, sold: 0, revenue: 0 };
        agg[key].sold += Number(it.quantity || 0);
        agg[key].revenue += Number(it.total || 0);
      });
      setTopProducts(Object.values(agg).sort((a, b) => b.revenue - a.revenue).slice(0, 5));
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      toast({ title: "Failed to load dashboard", variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const ch = supabase
      .channel("dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "sellers" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    invalidateAll();
    toast({ title: "Dashboard refreshed" });
  };

  const heroStats = useMemo(() => ([
    {
      title: "Today's Revenue",
      value: currency(kpi.todayRevenue),
      delta: <Delta current={kpi.todayRevenue} previous={kpi.yesterdayRevenue} />,
      icon: DollarSign,
      accent: "from-emerald-500/20 to-teal-500/10",
      iconClass: "bg-emerald-500/15 text-emerald-600",
    },
    {
      title: "Today's Orders",
      value: kpi.todayOrders.toString(),
      delta: <Delta current={kpi.todayOrders} previous={kpi.yesterdayOrders} />,
      icon: ShoppingCart,
      accent: "from-blue-500/20 to-indigo-500/10",
      iconClass: "bg-blue-500/15 text-blue-600",
    },
    {
      title: "New Signups Today",
      value: kpi.newUsersToday.toString(),
      delta: <Delta current={kpi.newUsersToday} previous={kpi.newUsersYesterday} />,
      icon: Users,
      accent: "from-purple-500/20 to-fuchsia-500/10",
      iconClass: "bg-purple-500/15 text-purple-600",
    },
    {
      title: "Active Sellers",
      value: kpi.totalSellers.toString(),
      delta: <span className="text-xs text-muted-foreground">approved vendors</span>,
      icon: Store,
      accent: "from-orange-500/20 to-amber-500/10",
      iconClass: "bg-orange-500/15 text-orange-600",
    },
  ]), [kpi]);

  return (
    <AdminLayout title="Command Center">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 rounded-full px-3 py-1 mb-2">
              <Sparkles className="h-3 w-3" />
              Command Center
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              Welcome back, Admin
            </h1>
            <p className="text-sm text-muted-foreground">
              Live overview of your marketplace — last 30 days.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setCmdOpen(true)} className="gap-2">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search commands</span>
              <kbd className="hidden md:inline-flex ml-2 pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Hero KPIs */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {heroStats.map((s) => (
            <Card key={s.title} className={`relative overflow-hidden bg-gradient-to-br ${s.accent} border-border/50`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2.5 rounded-xl ${s.iconClass}`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.title}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{loading ? "…" : s.value}</p>
                <div className="mt-2">{s.delta}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <Card className="border-warning/30 bg-warning/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-warning" />
                Needs your attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {alerts.map((a) => (
                  <Link key={a.id} to={a.href}
                    className="group flex items-center gap-3 p-3 rounded-lg bg-background border hover:border-primary transition-all hover:shadow-md">
                    <div className={`p-2 rounded-lg ${
                      a.tone === "danger" ? "bg-destructive/15 text-destructive" :
                      a.tone === "warning" ? "bg-warning/15 text-warning" :
                      "bg-blue-500/15 text-blue-600"
                    }`}>
                      <a.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{a.label}</p>
                      <p className="text-lg font-bold leading-tight">{a.count}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chart + Quick Actions */}
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Revenue — last 7 days</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Total: {currency(chartData.reduce((s, d) => s + d.revenue, 0))}</p>
              </div>
              <Link to="/admin/reports">
                <Button variant="ghost" size="sm">Details <ArrowUpRight className="h-3 w-3 ml-1" /></Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11}
                      tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8, fontSize: 12,
                      }}
                      formatter={(value: any, name: string) => name === "revenue" ? [currency(value), "Revenue"] : [value, "Orders"]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#rev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { to: "/admin/products/new", label: "Add New Product", icon: Package },
                { to: "/admin/sellers", label: "Approve Sellers", icon: Store },
                { to: "/admin/coupons", label: "Create Coupon", icon: Percent },
                { to: "/admin/push-notifications", label: "Send Push Notification", icon: Bell },
                { to: "/admin/marketing", label: "Launch Campaign", icon: Megaphone },
              ].map((a) => (
                <Link key={a.to} to={a.to}
                  className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted hover:border-primary/50 transition-all group">
                  <div className="flex items-center gap-2.5">
                    <a.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                    <span className="text-sm">{a.label}</span>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders + Top Products */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Recent Orders</CardTitle>
              <Link to="/admin/orders">
                <Button variant="ghost" size="sm">View all <ArrowUpRight className="h-3 w-3 ml-1" /></Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}</div>
              ) : recentOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No orders yet</p>
              ) : (
                <div className="divide-y">
                  {recentOrders.map((o) => (
                    <button key={o.id} onClick={() => navigate("/admin/orders")}
                      className="w-full flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded transition-colors">
                      <div className="text-left min-w-0">
                        <p className="font-medium text-sm truncate">#{o.order_number}</p>
                        <p className="text-xs text-muted-foreground">
                          <Clock className="inline h-3 w-3 mr-1" />
                          {formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold text-sm">{currency(o.total)}</span>
                        <Badge variant="outline" className={`text-[10px] ${statusColors[o.status] || ""}`}>
                          {o.status}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Top Products (30d)</CardTitle>
              <Link to="/admin/products">
                <Button variant="ghost" size="sm">View all <ArrowUpRight className="h-3 w-3 ml-1" /></Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}</div>
              ) : topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No sales data yet</p>
              ) : (
                <div className="divide-y">
                  {topProducts.map((p, idx) => (
                    <div key={p.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          idx === 0 ? "bg-amber-500/20 text-amber-600" :
                          idx === 1 ? "bg-slate-400/20 text-slate-600" :
                          idx === 2 ? "bg-orange-500/20 text-orange-600" :
                          "bg-muted text-muted-foreground"
                        }`}>#{idx + 1}</div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.sold} sold</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold shrink-0">{currency(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Command Palette */}
        <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
          <CommandInput placeholder="Search pages, actions, settings…" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {["Quick Actions", "Navigate"].map((group) => (
              <div key={group}>
                <CommandGroup heading={group}>
                  {COMMAND_ROUTES.filter((r) => r.group === group).map((r) => (
                    <CommandItem key={r.href} value={r.label}
                      onSelect={() => { setCmdOpen(false); navigate(r.href); }}>
                      <r.icon className="h-4 w-4 mr-2 text-muted-foreground" />
                      {r.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </div>
            ))}
          </CommandList>
        </CommandDialog>
      </div>
    </AdminLayout>
  );
}
