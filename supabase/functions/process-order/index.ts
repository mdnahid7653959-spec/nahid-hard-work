import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderItem {
  product_id: string;
  variant_id?: string;
  quantity: number;
}

interface ShippingAddress {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state?: string;
  zipCode: string;
  country: string;
  phone: string;
}

interface CreateOrderRequest {
  items: OrderItem[];
  shipping_address: ShippingAddress;
  payment_method: string;
  coupon_code?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's auth
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getUser(token);
    
    if (claimsError || !claimsData.user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.user.id;
    const userEmail = claimsData.user.email;

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...data } = await req.json();

    if (action === "create") {
      const { items, shipping_address, payment_method, coupon_code } = data as CreateOrderRequest;

      // Validate items
      if (!items || items.length === 0) {
        return new Response(
          JSON.stringify({ error: "No items in order" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch product details and validate stock
      const productIds = items.map(item => item.product_id);
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, name, regular_price, discount_price, stock_quantity, status, seller_id")
        .in("id", productIds);

      if (productsError || !products) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch products" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate stock and calculate totals
      const productMap = new Map(products.map(p => [p.id, p]));
      let subtotal = 0;
      const validatedItems: Array<{
        product_id: string;
        product_name: string;
        variant_id?: string;
        quantity: number;
        price: number;
        total: number;
      }> = [];

      for (const item of items) {
        const product = productMap.get(item.product_id);
        if (!product) {
          return new Response(
            JSON.stringify({ error: `Product not found: ${item.product_id}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (product.status !== "active") {
          return new Response(
            JSON.stringify({ error: `Product is not available: ${product.name}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (product.stock_quantity !== null && product.stock_quantity < item.quantity) {
          return new Response(
            JSON.stringify({ error: `Insufficient stock for: ${product.name}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const price = product.discount_price || product.regular_price;
        const itemTotal = price * item.quantity;
        subtotal += itemTotal;

        validatedItems.push({
          product_id: item.product_id,
          product_name: product.name,
          variant_id: item.variant_id,
          quantity: item.quantity,
          price,
          total: itemTotal
        });
      }

      // Apply coupon if provided
      let discountAmount = 0;
      if (coupon_code) {
        const { data: coupon } = await supabase
          .from("coupons")
          .select("*")
          .eq("code", coupon_code.toUpperCase())
          .eq("is_active", true)
          .single();

        if (coupon) {
          const now = new Date();
          const startDate = coupon.start_date ? new Date(coupon.start_date) : null;
          const endDate = coupon.end_date ? new Date(coupon.end_date) : null;

          if ((!startDate || now >= startDate) && (!endDate || now <= endDate)) {
            if (!coupon.min_order_amount || subtotal >= coupon.min_order_amount) {
              if (!coupon.usage_limit || coupon.used_count < coupon.usage_limit) {
                if (coupon.discount_type === "percentage") {
                  discountAmount = (subtotal * coupon.discount_value) / 100;
                  if (coupon.max_discount_amount) {
                    discountAmount = Math.min(discountAmount, coupon.max_discount_amount);
                  }
                } else {
                  discountAmount = coupon.discount_value;
                }

                // Increment coupon usage
                await supabase
                  .from("coupons")
                  .update({ used_count: (coupon.used_count || 0) + 1 })
                  .eq("id", coupon.id);
              }
            }
          }
        }
      }

      // Calculate shipping (free over 3500 BDT)
      const shippingCost = subtotal >= 3500 ? 0 : 60;
      
      // Calculate tax (5%)
      const taxAmount = subtotal * 0.05;
      
      // Calculate total
      const total = subtotal + shippingCost + taxAmount - discountAmount;

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Determine seller_id from products
      // Products store profile.id as seller_id, but orders.seller_id FK references sellers.id
      // So we need to map profile_id -> sellers.id
      const productSellerIds = [...new Set(products.map(p => p.seller_id).filter(Boolean))];
      let orderSellerId: string | null = null;
      
      if (productSellerIds.length > 0) {
        // Look up the actual seller record using profile_id (which is what products store)
        const { data: sellerRecord } = await supabase
          .from("sellers")
          .select("id")
          .in("user_id", 
            // Get user_ids from profiles that match the product seller_ids (profile ids)
            (await supabase.from("profiles").select("user_id").in("id", productSellerIds)).data?.map(p => p.user_id) || []
          )
          .limit(1)
          .single();
        
        if (sellerRecord) {
          orderSellerId = sellerRecord.id;
        }
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: userId,
          order_number: orderNumber,
          seller_id: orderSellerId,
          subtotal,
          shipping_cost: shippingCost,
          tax_amount: taxAmount,
          discount_amount: discountAmount,
          total,
          status: "pending",
          payment_status: payment_method === "cod" ? "pending" : "awaiting_payment",
          payment_method,
          shipping_address: {
            ...shipping_address,
            email: userEmail
          }
        })
        .select()
        .single();

      if (orderError) {
        console.error("Order creation error:", orderError);
        return new Response(
          JSON.stringify({ error: "Failed to create order" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Insert order items
      const orderItems = validatedItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        variant_id: item.variant_id,
        quantity: item.quantity,
        price: item.price,
        total: item.total
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        console.error("Order items error:", itemsError);
        // Rollback order
        await supabase.from("orders").delete().eq("id", order.id);
        return new Response(
          JSON.stringify({ error: "Failed to create order items" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update product stock, sold_count and log inventory changes
      for (const item of validatedItems) {
        const product = productMap.get(item.product_id);
        
        // Get current sold_count to increment
        const { data: currentProduct } = await supabase
          .from("products")
          .select("sold_count")
          .eq("id", item.product_id)
          .single();
        
        const currentSoldCount = currentProduct?.sold_count || 0;
        const newSoldCount = currentSoldCount + item.quantity;
        
        if (product && product.stock_quantity !== null) {
          const newQuantity = product.stock_quantity - item.quantity;
          
          await supabase
            .from("products")
            .update({ 
              stock_quantity: newQuantity,
              sold_count: newSoldCount
            })
            .eq("id", item.product_id);

          await supabase
            .from("inventory_logs")
            .insert({
              product_id: item.product_id,
              variant_id: item.variant_id,
              order_id: order.id,
              change_type: "sale",
              quantity_change: -item.quantity,
              previous_quantity: product.stock_quantity,
              new_quantity: newQuantity,
              notes: `Order ${orderNumber}`
            });

          // Check if stock is below any alert threshold
          const { data: alert } = await supabase
            .from("inventory_alerts")
            .select("id, threshold")
            .eq("product_id", item.product_id)
            .eq("is_active", true)
            .single();

          if (alert && newQuantity <= alert.threshold) {
            // Trigger low stock alert
            try {
              await fetch(`${supabaseUrl}/functions/v1/check-alerts`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({
                  action: "trigger_low_stock",
                  product_id: item.product_id
                })
              });
            } catch (alertError) {
              console.error("Failed to trigger low stock alert:", alertError);
            }
          }
        } else {
          // Even if stock tracking is disabled, still update sold_count
          await supabase
            .from("products")
            .update({ sold_count: newSoldCount })
            .eq("id", item.product_id);
        }
      }

      // Clear user's cart
      await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", userId);

      // Create payment record if not COD
      if (payment_method !== "cod") {
        await supabase
          .from("payments")
          .insert({
            order_id: order.id,
            user_id: userId,
            payment_method,
            payment_provider: payment_method,
            amount: total,
            currency: "BDT",
            status: "pending"
          });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          order: {
            id: order.id,
            order_number: orderNumber,
            total,
            payment_method,
            status: order.status
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get") {
      const { order_id } = data;
      
      const { data: order, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (*)
        `)
        .eq("id", order_id)
        .eq("user_id", userId)
        .single();

      if (error || !order) {
        return new Response(
          JSON.stringify({ error: "Order not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ order }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Process order error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});