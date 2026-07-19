import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, ShoppingCart, Users, DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, RefreshCw, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminCacheInvalidation } from "@/hooks/useRealtimeSync";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
  pendingOrders: number;
  lowStockProducts: number;
}

interface RecentActivity {
  id: string;
  type: "order" | "product" | "user" | "review";
  message: string;
  timestamp: string;
  status?: string;
}

interface RecentOrder {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    lowStockProducts: 0,
  });
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { invalidateAll } = useAdminCacheInvalidation();
  const { toast } = useToast();

  const fetchDashboardData = async () => {
    try {
      const [productsRes, ordersRes, usersRes, lowStockRes, recentOrdersRes] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id, total, status, created_at", { count: "exact" }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }).lt("stock_quantity", 10),
        supabase.from("orders").select("id, order_number, total, status, created_at").order("created_at", { ascending: false }).limit(5),
      ]);

      const ordersData = ordersRes.data || [];
      const revenue = ordersData.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const pendingOrders = ordersData.filter((o) => o.status === "pending").length;

      setStats({
        totalProducts: productsRes.count || 0,
        totalOrders: ordersRes.count || 0,
        totalUsers: usersRes.count || 0,
        totalRevenue: revenue,
        pendingOrders,
        lowStockProducts: lowStockRes.count || 0,
      });

      setRecentOrders(recentOrdersRes.data || []);

      // Build real activities from recent data
      const recentActivities: RecentActivity[] = [];

      // Add recent orders as activities
      (recentOrdersRes.data || []).slice(0, 3).forEach((order) => {
        recentActivities.push({
          id: `order-${order.id}`,
          type: "order",
          message: `Order #${order.order_number} - ৳${order.total.toFixed(2)}`,
          timestamp: order.created_at,
          status: order.status,
        });
      });

      // Fetch recent products
      const { data: recentProducts } = await supabase
        .from("products")
        .select("id, name, created_at")
        .order("created_at", { ascending: false })
        .limit(2);

      (recentProducts || []).forEach((product) => {
        recentActivities.push({
          id: `product-${product.id}`,
          type: "product",
          message: `Product added: ${product.name}`,
          timestamp: product.created_at || new Date().toISOString(),
        });
      });

      // Fetch recent users
      const { data: recentUsers } = await supabase
        .from("profiles")
        .select("id, full_name, email, created_at")
        .order("created_at", { ascending: false })
        .limit(2);

      (recentUsers || []).forEach((user) => {
        recentActivities.push({
          id: `user-${user.id}`,
          type: "user",
          message: `New user: ${user.full_name || user.email}`,
          timestamp: user.created_at || new Date().toISOString(),
        });
      });

      // Sort by timestamp
      recentActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(recentActivities.slice(0, 6));
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();

    // Set up real-time subscriptions for live updates
    const ordersChannel = supabase
      .channel("dashboard-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchDashboardData();
      })
      .subscribe();

    const productsChannel = supabase
      .channel("dashboard-products")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(productsChannel);
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    invalidateAll();
    toast({ title: "Dashboard refreshed" });
    setRefreshing(false);
  };

  const getActivityColor = (type: string, status?: string) => {
    if (type === "order") {
      if (status === "delivered") return "bg-success";
      if (status === "cancelled") return "bg-destructive";
      if (status === "processing" || status === "shipped") return "bg-blue-500";
      return "bg-warning";
    }
    if (type === "product") return "bg-primary";
    if (type === "user") return "bg-purple-500";
    if (type === "review") return "bg-amber-500";
    return "bg-muted";
  };

  const statusColors: Record<string, string> = {
    pending: "bg-warning text-warning-foreground",
    processing: "bg-blue-500 text-white",
    shipped: "bg-purple-500 text-white",
    delivered: "bg-success text-success-foreground",
    cancelled: "bg-destructive text-destructive-foreground",
  };

  const statCards = [
    {
      title: "Total Products",
      value: stats.totalProducts,
      icon: Package,
      color: "text-primary",
      href: "/admin/products",
      badge: stats.lowStockProducts > 0 ? `${stats.lowStockProducts} low stock` : undefined,
      badgeVariant: "destructive" as const,
    },
    {
      title: "Total Orders",
      value: stats.totalOrders,
      icon: ShoppingCart,
      color: "text-blue-500",
      href: "/admin/orders",
      badge: stats.pendingOrders > 0 ? `${stats.pendingOrders} pending` : undefined,
      badgeVariant: "secondary" as const,
    },
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-purple-500",
      href: "/admin/users",
    },
    {
      title: "Revenue",
      value: `৳${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "text-success",
      href: "/admin/orders",
    },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's what's happening with your store.</p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Link key={stat.title} to={stat.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {loading ? "..." : stat.value}
                  </div>
                  {stat.badge && (
                    <Badge variant={stat.badgeVariant} className="mt-2 text-xs">
                      {stat.badge}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                to="/admin/products/new"
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
              >
                <span>Add New Product</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                to="/admin/categories"
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
              >
                <span>Manage Categories</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                to="/admin/orders"
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>View Orders</span>
                  {stats.pendingOrders > 0 && (
                    <Badge variant="secondary">{stats.pendingOrders} new</Badge>
                  )}
                </div>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                to="/admin/coupons"
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
              >
                <span>Create Coupon</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-muted" />
                      <div className="flex-1 space-y-1">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <p className="text-muted-foreground text-sm">No recent activity</p>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${getActivityColor(activity.type, activity.status)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{activity.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                      {activity.status && (
                        <Badge className={`text-xs ${statusColors[activity.status] || "bg-muted"}`}>
                          {activity.status}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <Link to="/admin/orders">
              <Button variant="ghost" size="sm">
                View All
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-2 animate-pulse">
                    <div className="space-y-1">
                      <div className="h-4 bg-muted rounded w-24" />
                      <div className="h-3 bg-muted rounded w-16" />
                    </div>
                    <div className="h-6 bg-muted rounded w-20" />
                  </div>
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No orders yet</p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium">#{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">৳{order.total.toFixed(2)}</span>
                      <Badge className={statusColors[order.status] || "bg-muted"}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
