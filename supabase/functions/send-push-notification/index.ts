import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PushNotificationPayload {
  title: string;
  message: string;
  image_url?: string;
  action_url?: string;
  target_type: "all" | "segment" | "individual";
  target_users?: string[];
}

interface FCMMessage {
  to: string;
  notification: {
    title: string;
    body: string;
    image?: string;
  };
  data?: {
    url?: string;
    type?: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FIREBASE_SERVER_KEY = Deno.env.get("FIREBASE_SERVER_KEY");
    if (!FIREBASE_SERVER_KEY) {
      throw new Error("Firebase Server Key not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin session from authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminToken = authHeader.replace("Bearer ", "");
    
    // Check admin session
    const { data: adminSession, error: sessionError } = await supabase
      .from("admin_sessions")
      .select("admin_id, admin_credentials(display_name)")
      .eq("session_token", adminToken)
      .eq("is_valid", true)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (sessionError || !adminSession) {
      return new Response(JSON.stringify({ error: "Invalid admin session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: PushNotificationPayload = await req.json();
    const { title, message, image_url, action_url, target_type, target_users } = payload;

    if (!title || !message) {
      return new Response(
        JSON.stringify({ error: "Title and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create notification record
    const { data: notification, error: notifError } = await supabase
      .from("push_notifications")
      .insert({
        title,
        message,
        image_url,
        action_url,
        target_type,
        target_users,
        status: "sending",
        sent_by: (adminSession.admin_credentials as any)?.display_name || "Admin",
      })
      .select()
      .single();

    if (notifError) {
      throw new Error(`Failed to create notification: ${notifError.message}`);
    }

    // Get target tokens
    let tokensQuery = supabase
      .from("push_tokens")
      .select("token, user_id")
      .eq("is_active", true);

    if (target_type === "individual" && target_users && target_users.length > 0) {
      tokensQuery = tokensQuery.in("user_id", target_users);
    }

    const { data: tokens, error: tokensError } = await tokensQuery;

    if (tokensError) {
      throw new Error(`Failed to fetch tokens: ${tokensError.message}`);
    }

    if (!tokens || tokens.length === 0) {
      // Update notification as sent with 0 count
      await supabase
        .from("push_notifications")
        .update({ status: "sent", sent_count: 0, sent_at: new Date().toISOString() })
        .eq("id", notification.id);

      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No active tokens found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send FCM notifications
    let sentCount = 0;
    let failedCount = 0;
    const failedTokens: string[] = [];

    for (const { token, user_id } of tokens) {
      const fcmMessage: FCMMessage = {
        to: token,
        notification: {
          title,
          body: message,
          ...(image_url && { image: image_url }),
        },
        data: {
          ...(action_url && { url: action_url }),
          type: "admin_notification",
        },
      };

      try {
        const fcmResponse = await fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `key=${FIREBASE_SERVER_KEY}`,
          },
          body: JSON.stringify(fcmMessage),
        });

        const fcmResult = await fcmResponse.json();

        if (fcmResult.success === 1) {
          sentCount++;
          
          // Also create in-app notification
          await supabase.from("notifications").insert({
            user_id,
            title,
            message,
            type: "campaign",
            action_url,
          });
        } else {
          failedCount++;
          if (fcmResult.results?.[0]?.error === "NotRegistered" || 
              fcmResult.results?.[0]?.error === "InvalidRegistration") {
            failedTokens.push(token);
          }
        }
      } catch (sendError) {
        console.error(`Failed to send to token: ${token}`, sendError);
        failedCount++;
      }
    }

    // Deactivate invalid tokens
    if (failedTokens.length > 0) {
      await supabase
        .from("push_tokens")
        .update({ is_active: false })
        .in("token", failedTokens);
    }

    // Update notification record
    await supabase
      .from("push_notifications")
      .update({
        status: "sent",
        sent_count: sentCount,
        failed_count: failedCount,
        sent_at: new Date().toISOString(),
      })
      .eq("id", notification.id);

    return new Response(
      JSON.stringify({
        success: true,
        notification_id: notification.id,
        sent: sentCount,
        failed: failedCount,
        total_tokens: tokens.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Push notification error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
