import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Payment provider configurations (to be set as secrets)
const BKASH_APP_KEY = Deno.env.get("BKASH_APP_KEY");
const BKASH_APP_SECRET = Deno.env.get("BKASH_APP_SECRET");
const BKASH_USERNAME = Deno.env.get("BKASH_USERNAME");
const BKASH_PASSWORD = Deno.env.get("BKASH_PASSWORD");
const BKASH_BASE_URL = Deno.env.get("BKASH_BASE_URL") || "https://tokenized.sandbox.bka.sh/v1.2.0-beta";

const NAGAD_MERCHANT_ID = Deno.env.get("NAGAD_MERCHANT_ID");
const NAGAD_MERCHANT_KEY = Deno.env.get("NAGAD_MERCHANT_KEY");
const NAGAD_BASE_URL = Deno.env.get("NAGAD_BASE_URL") || "http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs";

interface PaymentRequest {
  action: "initiate" | "verify" | "callback" | "refund";
  provider: "bkash" | "nagad" | "rocket" | "sslcommerz";
  order_id: string;
  amount?: number;
  transaction_id?: string;
  callback_data?: Record<string, unknown>;
}

// bKash Token Management
let bkashToken: { token: string; expiresAt: number } | null = null;

async function getBkashToken(): Promise<string> {
  if (bkashToken && bkashToken.expiresAt > Date.now()) {
    return bkashToken.token;
  }

  const response = await fetch(`${BKASH_BASE_URL}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "username": BKASH_USERNAME || "",
      "password": BKASH_PASSWORD || ""
    },
    body: JSON.stringify({
      app_key: BKASH_APP_KEY,
      app_secret: BKASH_APP_SECRET
    })
  });

  const data = await response.json();
  
  if (data.id_token) {
    bkashToken = {
      token: data.id_token,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000
    };
    return data.id_token;
  }

  throw new Error("Failed to get bKash token");
}

async function initiateBkashPayment(orderId: string, amount: number, callbackUrl: string) {
  const token = await getBkashToken();
  
  const response = await fetch(`${BKASH_BASE_URL}/tokenized/checkout/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": token,
      "X-APP-Key": BKASH_APP_KEY || ""
    },
    body: JSON.stringify({
      mode: "0011",
      payerReference: orderId,
      callbackURL: callbackUrl,
      amount: amount.toString(),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: orderId
    })
  });

  return response.json();
}

async function verifyBkashPayment(paymentId: string) {
  const token = await getBkashToken();
  
  const response = await fetch(`${BKASH_BASE_URL}/tokenized/checkout/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": token,
      "X-APP-Key": BKASH_APP_KEY || ""
    },
    body: JSON.stringify({ paymentID: paymentId })
  });

  return response.json();
}

async function initiateNagadPayment(orderId: string, amount: number, callbackUrl: string) {
  // Nagad payment initiation logic
  // This is a placeholder - actual implementation requires Nagad API integration
  const timestamp = new Date().toISOString();
  
  const response = await fetch(`${NAGAD_BASE_URL}/check-out/initialize/${NAGAD_MERCHANT_ID}/${orderId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-KM-Api-Version": "v-0.2.0",
      "X-KM-IP-V4": "127.0.0.1",
      "X-KM-Client-Type": "PC_WEB"
    },
    body: JSON.stringify({
      dateTime: timestamp,
      sensitiveData: {
        merchantId: NAGAD_MERCHANT_ID,
        datetime: timestamp,
        orderId: orderId,
        challenge: Math.random().toString(36).substring(2)
      }
    })
  });

  return response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, provider, order_id, amount, transaction_id, callback_data } = await req.json() as PaymentRequest;

    // For callback/webhook, skip auth (but verify signature)
    if (action !== "callback") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });

      const token = authHeader.replace("Bearer ", "");
      const { error: authError } = await supabaseClient.auth.getUser(token);
      
      if (authError) {
        return new Response(
          JSON.stringify({ error: "Invalid token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Verify order exists
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, total, payment_status, user_id")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = Deno.env.get("SITE_URL") || "https://your-site.com";
    const callbackUrl = `${baseUrl}/payment/callback?provider=${provider}&order_id=${order_id}`;

    if (action === "initiate") {
      let paymentResponse;

      switch (provider) {
        case "bkash":
          if (!BKASH_APP_KEY || !BKASH_APP_SECRET) {
            return new Response(
              JSON.stringify({ 
                error: "bKash not configured",
                message: "Please configure bKash API credentials" 
              }),
              { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          paymentResponse = await initiateBkashPayment(order.order_number, order.total, callbackUrl);
          break;

        case "nagad":
          if (!NAGAD_MERCHANT_ID || !NAGAD_MERCHANT_KEY) {
            return new Response(
              JSON.stringify({ 
                error: "Nagad not configured",
                message: "Please configure Nagad API credentials" 
              }),
              { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          paymentResponse = await initiateNagadPayment(order.order_number, order.total, callbackUrl);
          break;

        case "rocket":
          // Rocket uses SSL Commerz as payment aggregator
          return new Response(
            JSON.stringify({ 
              error: "Rocket not yet implemented",
              message: "Rocket payment integration coming soon" 
            }),
            { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );

        case "sslcommerz":
          // SSLCommerz integration placeholder
          return new Response(
            JSON.stringify({ 
              error: "SSLCommerz not yet implemented",
              message: "SSLCommerz integration coming soon" 
            }),
            { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );

        default:
          return new Response(
            JSON.stringify({ error: "Invalid payment provider" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
      }

      // Update payment record
      await supabase
        .from("payments")
        .update({
          provider_response: paymentResponse,
          status: "processing"
        })
        .eq("order_id", order_id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          payment: paymentResponse,
          redirect_url: paymentResponse.bkashURL || paymentResponse.callBackUrl
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify") {
      let verifyResponse;

      switch (provider) {
        case "bkash":
          if (!transaction_id) {
            return new Response(
              JSON.stringify({ error: "Transaction ID required" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          verifyResponse = await verifyBkashPayment(transaction_id);
          break;

        default:
          return new Response(
            JSON.stringify({ error: "Verification not supported for this provider" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
      }

      const isSuccessful = verifyResponse.statusCode === "0000" || 
                          verifyResponse.transactionStatus === "Completed";

      // Update payment and order status
      if (isSuccessful) {
        await supabase
          .from("payments")
          .update({
            status: "completed",
            transaction_id: verifyResponse.trxID || transaction_id,
            provider_status: verifyResponse.transactionStatus,
            provider_response: verifyResponse,
            paid_at: new Date().toISOString()
          })
          .eq("order_id", order_id);

        await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            status: "processing"
          })
          .eq("id", order_id);
      } else {
        await supabase
          .from("payments")
          .update({
            status: "failed",
            provider_status: verifyResponse.statusMessage || "Failed",
            provider_response: verifyResponse,
            failed_at: new Date().toISOString()
          })
          .eq("order_id", order_id);

        await supabase
          .from("orders")
          .update({ payment_status: "failed" })
          .eq("id", order_id);

        // Trigger payment failed notification
        try {
          await fetch(`${supabaseUrl}/functions/v1/check-alerts`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              action: "trigger_payment_failed",
              order_id: order_id
            })
          });
        } catch (notifyError) {
          console.error("Failed to trigger payment notification:", notifyError);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: isSuccessful,
          verified: isSuccessful,
          message: isSuccessful ? "Payment verified successfully" : "Payment verification failed",
          details: verifyResponse
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "callback") {
      // Handle payment provider callbacks/webhooks
      console.log("Payment callback received:", { provider, order_id, callback_data });

      // Verify the callback is authentic (implement signature verification per provider)
      // This is critical for security - never trust callback data without verification

      // For now, log and acknowledge
      await supabase
        .from("payments")
        .update({
          metadata: {
            callback_received: true,
            callback_data,
            received_at: new Date().toISOString()
          }
        })
        .eq("order_id", order_id);

      return new Response(
        JSON.stringify({ success: true, message: "Callback received" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "refund") {
      // Refund logic - to be implemented per provider
      return new Response(
        JSON.stringify({ 
          error: "Refund not yet implemented",
          message: "Please process refunds manually through provider dashboard" 
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Payment gateway error:", error);
    return new Response(
      JSON.stringify({ error: "Payment processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});