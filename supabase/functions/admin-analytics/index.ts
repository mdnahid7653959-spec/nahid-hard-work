import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Verify admin session
async function verifyAdminSession(supabase: any, adminId: string): Promise<boolean> {
  if (!adminId) return false;
  
  const { data: admin, error } = await supabase
    .from("admin_credentials")
    .select("id, is_active")
    .eq("id", adminId)
    .eq("is_active", true)
    .single();
  
  return !error && !!admin;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, adminId, data } = await req.json();

    // Verify admin session
    const isValidAdmin = await verifyAdminSession(supabase, adminId);
    if (!isValidAdmin) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid admin session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "dashboard") {
      // Get counts
      const [
        { count: totalProducts },
        { count: totalOrders },
        { count: totalUsers },
        { count: pendingOrders }
      ] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending")
      ]);

      // Get revenue (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: recentOrders } = await supabase
        .from("orders")
        .select("total, payment_status")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .eq("payment_status", "paid");

      const monthlyRevenue = recentOrders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

      // Get today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayOrders } = await supabase
        .from("orders")
        .select("total, payment_status")
        .gte("created_at", today.toISOString());

      const todayRevenue = todayOrders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
      const todayOrderCount = todayOrders?.length || 0;

      // Get low stock products
      const { data: lowStock } = await supabase
        .from("products")
        .select("id, name, stock_quantity")
        .lt("stock_quantity", 10)
        .gt("stock_quantity", 0)
        .order("stock_quantity", { ascending: true })
        .limit(5);

      // Get out of stock products
      const { count: outOfStock } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("stock_quantity", 0);

      return new Response(
        JSON.stringify({
          dashboard: {
            totalProducts: totalProducts || 0,
            totalOrders: totalOrders || 0,
            totalUsers: totalUsers || 0,
            pendingOrders: pendingOrders || 0,
            monthlyRevenue,
            todayRevenue,
            todayOrderCount,
            lowStockProducts: lowStock || [],
            outOfStockCount: outOfStock || 0
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "sales-report") {
      const { startDate, endDate, groupBy = "day" } = data || {};
      
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const { data: orders, error } = await supabase
        .from("orders")
        .select("total, status, payment_status, created_at")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: true });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Group by date
      const grouped = (orders || []).reduce((acc, order) => {
        const date = new Date(order.created_at);
        let key: string;
        
        switch (groupBy) {
          case "hour":
            key = `${date.toISOString().split("T")[0]} ${date.getHours()}:00`;
            break;
          case "day":
            key = date.toISOString().split("T")[0];
            break;
          case "week":
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().split("T")[0];
            break;
          case "month":
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            break;
          default:
            key = date.toISOString().split("T")[0];
        }

        if (!acc[key]) {
          acc[key] = { date: key, orders: 0, revenue: 0, paid: 0 };
        }
        
        acc[key].orders++;
        acc[key].revenue += order.total || 0;
        if (order.payment_status === "paid") {
          acc[key].paid += order.total || 0;
        }
        
        return acc;
      }, {} as Record<string, { date: string; orders: number; revenue: number; paid: number }>);

      return new Response(
        JSON.stringify({
          report: Object.values(grouped),
          summary: {
            totalOrders: orders?.length || 0,
            totalRevenue: orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0,
            paidRevenue: orders?.filter(o => o.payment_status === "paid").reduce((sum, o) => sum + (o.total || 0), 0) || 0
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "top-products") {
      const { limit = 10, period = "30d" } = data || {};
      
      let dateFilter = new Date();
      switch (period) {
        case "7d":
          dateFilter.setDate(dateFilter.getDate() - 7);
          break;
        case "30d":
          dateFilter.setDate(dateFilter.getDate() - 30);
          break;
        case "90d":
          dateFilter.setDate(dateFilter.getDate() - 90);
          break;
      }

      const { data: orderItems, error } = await supabase
        .from("order_items")
        .select(`
          product_id,
          product_name,
          quantity,
          total,
          orders!inner (created_at)
        `)
        .gte("orders.created_at", dateFilter.toISOString());

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Aggregate by product
      const productStats = (orderItems || []).reduce((acc, item) => {
        if (!acc[item.product_id]) {
          acc[item.product_id] = {
            product_id: item.product_id,
            product_name: item.product_name,
            totalQuantity: 0,
            totalRevenue: 0,
            orderCount: 0
          };
        }
        acc[item.product_id].totalQuantity += item.quantity;
        acc[item.product_id].totalRevenue += item.total;
        acc[item.product_id].orderCount++;
        return acc;
      }, {} as Record<string, any>);

      const topProducts = Object.values(productStats)
        .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
        .slice(0, limit);

      return new Response(
        JSON.stringify({ topProducts }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "customer-stats") {
      const { data: customers, error } = await supabase
        .from("profiles")
        .select("user_id, created_at");

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get order counts per customer
      const { data: orderCounts } = await supabase
        .from("orders")
        .select("user_id");

      const customerOrderCounts = (orderCounts || []).reduce((acc, o) => {
        acc[o.user_id] = (acc[o.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const withOrders = Object.keys(customerOrderCounts).length;
      const repeatCustomers = Object.values(customerOrderCounts).filter(c => c > 1).length;

      // New customers this month
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      
      const newThisMonth = (customers || []).filter(
        c => new Date(c.created_at) >= thisMonth
      ).length;

      return new Response(
        JSON.stringify({
          stats: {
            totalCustomers: customers?.length || 0,
            customersWithOrders: withOrders,
            repeatCustomers,
            newThisMonth,
            conversionRate: customers?.length ? ((withOrders / customers.length) * 100).toFixed(1) : 0
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Admin analytics error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});