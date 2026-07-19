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

    const { action, adminId, orderId, data } = await req.json();

    // Verify admin session
    const isValidAdmin = await verifyAdminSession(supabase, adminId);
    if (!isValidAdmin) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid admin session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "list") {
      const { page = 1, limit = 20, status, search } = data || {};
      const offset = (page - 1) * limit;

      let query = supabase
        .from("orders")
        .select(`
          *,
          order_items (
            id, product_name, quantity, price, total
          )
        `, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      if (search) {
        query = query.or(`order_number.ilike.%${search}%`);
      }

      const { data: orders, error, count } = await query;

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          orders, 
          total: count,
          page,
          totalPages: Math.ceil((count || 0) / limit)
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get") {
      const { data: order, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (*),
          payments (*)
        `)
        .eq("id", orderId)
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get customer info
      const { data: customer } = await supabase
        .from("profiles")
        .select("email, full_name, phone")
        .eq("user_id", order.user_id)
        .single();

      return new Response(
        JSON.stringify({ order: { ...order, customer } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update-status") {
      const { status: newStatus, notes, tracking_number, courier_name } = data;
      
      const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"];
      if (!validStatuses.includes(newStatus)) {
        return new Response(
          JSON.stringify({ error: "Invalid status" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get order details first
      const { data: orderData } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", orderId)
        .single();

      if (!orderData) {
        return new Response(
          JSON.stringify({ error: "Order not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updateData: Record<string, unknown> = { status: newStatus };
      if (notes) {
        updateData.notes = notes;
      }
      if (tracking_number) {
        updateData.tracking_number = tracking_number;
      }
      if (courier_name) {
        updateData.courier_name = courier_name;
      }
      if (newStatus === "shipped") {
        updateData.shipped_at = new Date().toISOString();
      }
      if (newStatus === "delivered") {
        updateData.delivered_at = new Date().toISOString();
      }

      // If cancelled, restore stock
      if (newStatus === "cancelled" || newStatus === "refunded") {
        const { data: orderItems } = await supabase
          .from("order_items")
          .select("product_id, quantity")
          .eq("order_id", orderId);

        if (orderItems) {
          for (const item of orderItems) {
            const { data: product } = await supabase
              .from("products")
              .select("stock_quantity")
              .eq("id", item.product_id)
              .single();

            if (product) {
              const newStock = (product.stock_quantity || 0) + item.quantity;
              await supabase
                .from("products")
                .update({ stock_quantity: newStock })
                .eq("id", item.product_id);

              await supabase
                .from("inventory_logs")
                .insert({
                  product_id: item.product_id,
                  order_id: orderId,
                  change_type: newStatus === "refunded" ? "return" : "adjustment",
                  quantity_change: item.quantity,
                  previous_quantity: product.stock_quantity || 0,
                  new_quantity: newStock,
                  notes: `Order ${newStatus}`
                });
            }
          }
        }
      }

      const { data: order, error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get customer info for notifications
      const { data: customer } = await supabase
        .from("profiles")
        .select("email, full_name, phone")
        .eq("user_id", orderData.user_id)
        .single();

      // Create in-app notification
      let notificationTitle = "";
      let notificationMessage = "";
      let emailType = "";
      
      switch (newStatus) {
        case "processing":
          notificationTitle = "Order Confirmed";
          notificationMessage = `Your order #${orderData.order_number} has been confirmed and is being processed.`;
          emailType = "order_confirmed";
          break;
        case "shipped":
          notificationTitle = "Order Shipped";
          notificationMessage = `Your order #${orderData.order_number} has been shipped${tracking_number ? `. Tracking: ${tracking_number}` : ""}.`;
          emailType = "order_shipped";
          break;
        case "delivered":
          notificationTitle = "Order Delivered";
          notificationMessage = `Your order #${orderData.order_number} has been delivered. Enjoy your purchase!`;
          emailType = "order_delivered";
          break;
        case "cancelled":
          notificationTitle = "Order Cancelled";
          notificationMessage = `Your order #${orderData.order_number} has been cancelled.${notes ? ` Reason: ${notes}` : ""}`;
          emailType = "order_cancelled";
          break;
        case "refunded":
          notificationTitle = "Order Refunded";
          notificationMessage = `Your order #${orderData.order_number} has been refunded. The amount will be credited within 3-5 business days.`;
          emailType = "order_cancelled";
          break;
      }

      if (notificationTitle) {
        // Insert notification to database
        await supabase.from("notifications").insert({
          user_id: orderData.user_id,
          title: notificationTitle,
          message: notificationMessage,
          type: "order",
          action_url: `/orders/${orderId}`,
          metadata: { order_number: orderData.order_number, status: newStatus }
        });

        // Send email notification if customer email exists
        if (customer?.email && emailType) {
          const shippingAddress = orderData.shipping_address as any;
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                type: emailType,
                recipientEmail: customer.email,
                recipientName: customer.full_name || shippingAddress?.firstName || "Customer",
                details: {
                  orderNumber: orderData.order_number,
                  orderTotal: orderData.total,
                  trackingNumber: tracking_number || orderData.tracking_number,
                  courierName: courier_name || orderData.courier_name,
                  reason: notes,
                }
              })
            });
          } catch (emailError) {
            console.error("Failed to send email notification:", emailError);
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, order }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update-payment") {
      const { payment_status } = data;
      
      const validStatuses = ["pending", "paid", "failed", "refunded"];
      if (!validStatuses.includes(payment_status)) {
        return new Response(
          JSON.stringify({ error: "Invalid payment status" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: order, error } = await supabase
        .from("orders")
        .update({ payment_status })
        .eq("id", orderId)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update payment record if exists
      await supabase
        .from("payments")
        .update({ 
          status: payment_status === "paid" ? "completed" : payment_status,
          paid_at: payment_status === "paid" ? new Date().toISOString() : null
        })
        .eq("order_id", orderId);

      return new Response(
        JSON.stringify({ success: true, order }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "analytics") {
      const { period = "30d" } = data || {};
      
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
        case "1y":
          dateFilter.setFullYear(dateFilter.getFullYear() - 1);
          break;
      }

      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, total, status, payment_status, created_at")
        .gte("created_at", dateFilter.toISOString());

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
      const paidOrders = orders?.filter(o => o.payment_status === "paid") || [];
      const paidRevenue = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      
      const statusCounts = orders?.reduce((acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return new Response(
        JSON.stringify({
          analytics: {
            totalOrders,
            totalRevenue,
            paidRevenue,
            averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
            statusBreakdown: statusCounts,
            period
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
    console.error("Admin orders error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});