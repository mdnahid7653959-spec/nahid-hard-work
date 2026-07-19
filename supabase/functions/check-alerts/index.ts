import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertRequest {
  action: "check_low_stock" | "check_failed_payments" | "trigger_low_stock" | "trigger_payment_failed";
  product_id?: string;
  order_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action, product_id, order_id } = await req.json() as AlertRequest;

    // ============ LOW STOCK ALERTS ============
    if (action === "check_low_stock") {
      // Get all active inventory alerts
      const { data: alerts } = await supabase
        .from("inventory_alerts")
        .select("*, products(id, name, stock_quantity, seller_id)")
        .eq("is_active", true)
        .eq("alert_type", "low_stock");

      if (!alerts || alerts.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: "No active alerts", triggered: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let triggeredCount = 0;

      for (const alert of alerts) {
        const product = alert.products as any;
        if (!product) continue;

        // Check if stock is below threshold
        if (product.stock_quantity <= alert.threshold) {
          // Check if we already triggered recently (within 24 hours)
          if (alert.last_triggered_at) {
            const lastTriggered = new Date(alert.last_triggered_at);
            const hoursSinceLastTrigger = (Date.now() - lastTriggered.getTime()) / (1000 * 60 * 60);
            if (hoursSinceLastTrigger < 24) {
              continue; // Skip if triggered within 24 hours
            }
          }

          // Get seller info
          if (product.seller_id) {
            const { data: seller } = await supabase
              .from("sellers")
              .select("contact_email, shop_name")
              .eq("id", product.seller_id)
              .single();

            if (seller?.contact_email) {
              // Send email notification
              try {
                await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${supabaseServiceKey}`,
                  },
                  body: JSON.stringify({
                    type: "low_stock_alert",
                    recipientEmail: seller.contact_email,
                    recipientName: seller.shop_name,
                    details: {
                      productName: product.name,
                      productStock: product.stock_quantity,
                      threshold: alert.threshold,
                    }
                  })
                });

                // Create in-app notification for seller (using seller's user_id)
                const { data: sellerData } = await supabase
                  .from("sellers")
                  .select("user_id")
                  .eq("id", product.seller_id)
                  .single();

                if (sellerData?.user_id) {
                  await supabase.from("notifications").insert({
                    user_id: sellerData.user_id,
                    title: "Low Stock Alert",
                    message: `Your product "${product.name}" has only ${product.stock_quantity} units left.`,
                    type: "alert",
                    action_url: "/seller/products",
                    metadata: { product_id: product.id, stock: product.stock_quantity, threshold: alert.threshold }
                  });
                }

                triggeredCount++;
              } catch (emailError) {
                console.error("Failed to send low stock email:", emailError);
              }
            }
          }

          // Update last triggered time
          await supabase
            .from("inventory_alerts")
            .update({ last_triggered_at: new Date().toISOString() })
            .eq("id", alert.id);
        }
      }

      return new Response(
        JSON.stringify({ success: true, triggered: triggeredCount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ TRIGGER LOW STOCK FOR SPECIFIC PRODUCT ============
    if (action === "trigger_low_stock" && product_id) {
      // Get product and check its alert
      const { data: alert } = await supabase
        .from("inventory_alerts")
        .select("*, products(id, name, stock_quantity, seller_id)")
        .eq("product_id", product_id)
        .eq("is_active", true)
        .single();

      if (!alert) {
        return new Response(
          JSON.stringify({ success: false, message: "No alert configured for this product" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const product = alert.products as any;
      if (product.stock_quantity > alert.threshold) {
        return new Response(
          JSON.stringify({ success: false, message: "Stock is above threshold" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get seller and send notification
      if (product.seller_id) {
        const { data: seller } = await supabase
          .from("sellers")
          .select("user_id, contact_email, shop_name")
          .eq("id", product.seller_id)
          .single();

        if (seller) {
          // Send email
          if (seller.contact_email) {
            await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                type: "low_stock_alert",
                recipientEmail: seller.contact_email,
                recipientName: seller.shop_name,
                details: {
                  productName: product.name,
                  productStock: product.stock_quantity,
                  threshold: alert.threshold,
                }
              })
            });
          }

          // Create notification
          if (seller.user_id) {
            await supabase.from("notifications").insert({
              user_id: seller.user_id,
              title: "Low Stock Alert",
              message: `Your product "${product.name}" has only ${product.stock_quantity} units left.`,
              type: "alert",
              action_url: "/seller/products",
            });
          }
        }
      }

      // Update last triggered
      await supabase
        .from("inventory_alerts")
        .update({ last_triggered_at: new Date().toISOString() })
        .eq("id", alert.id);

      return new Response(
        JSON.stringify({ success: true, message: "Low stock alert triggered" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ TRIGGER PAYMENT FAILED ============
    if (action === "trigger_payment_failed" && order_id) {
      // Get order details
      const { data: order } = await supabase
        .from("orders")
        .select("*, payments(*)")
        .eq("id", order_id)
        .single();

      if (!order) {
        return new Response(
          JSON.stringify({ success: false, message: "Order not found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get customer info
      const { data: customer } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("user_id", order.user_id)
        .single();

      if (customer?.email) {
        const payment = order.payments?.[0];
        
        // Send email notification
        await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            type: "payment_failed",
            recipientEmail: customer.email,
            recipientName: customer.full_name || "Customer",
            details: {
              orderNumber: order.order_number,
              orderTotal: order.total,
              paymentMethod: payment?.payment_method || order.payment_method || "Unknown",
            }
          })
        });
      }

      // Create in-app notification
      await supabase.from("notifications").insert({
        user_id: order.user_id,
        title: "Payment Failed",
        message: `Payment for order #${order.order_number} failed. Please try again.`,
        type: "alert",
        action_url: `/orders/${order_id}`,
        metadata: { order_number: order.order_number }
      });

      return new Response(
        JSON.stringify({ success: true, message: "Payment failed notification sent" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ CHECK FAILED PAYMENTS ============
    if (action === "check_failed_payments") {
      // Get recent failed payments that haven't been notified
      const { data: failedPayments } = await supabase
        .from("payments")
        .select("*, orders(id, order_number, user_id, total)")
        .eq("status", "failed")
        .is("metadata->notification_sent", null)
        .order("failed_at", { ascending: false })
        .limit(50);

      if (!failedPayments || failedPayments.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: "No new failed payments", notified: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let notifiedCount = 0;

      for (const payment of failedPayments) {
        const order = payment.orders as any;
        if (!order) continue;

        // Get customer
        const { data: customer } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("user_id", order.user_id)
          .single();

        if (customer?.email) {
          try {
            // Send email
            await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                type: "payment_failed",
                recipientEmail: customer.email,
                recipientName: customer.full_name || "Customer",
                details: {
                  orderNumber: order.order_number,
                  orderTotal: order.total,
                  paymentMethod: payment.payment_method,
                }
              })
            });

            // Create notification
            await supabase.from("notifications").insert({
              user_id: order.user_id,
              title: "Payment Failed",
              message: `Payment for order #${order.order_number} failed. Please try again.`,
              type: "alert",
              action_url: `/orders/${order.id}`,
            });

            // Mark as notified
            await supabase
              .from("payments")
              .update({ metadata: { ...payment.metadata, notification_sent: true, notified_at: new Date().toISOString() } })
              .eq("id", payment.id);

            notifiedCount++;
          } catch (error) {
            console.error("Failed to notify payment failure:", error);
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, notified: notifiedCount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Check alerts error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});