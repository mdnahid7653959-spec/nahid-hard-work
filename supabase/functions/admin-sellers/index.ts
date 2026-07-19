import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

interface AdminSellerRequest {
  action: "list" | "approve" | "reject" | "suspend" | "ban" | "unsuspend";
  sellerId?: string;
  reason?: string;
  adminId?: string;
  sessionToken?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create service role client to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse body first to get sessionToken
    const body: AdminSellerRequest = await req.json();
    const { action, sellerId, reason, adminId, sessionToken } = body;

    // Validate admin session token (from body or header fallback)
    const adminToken = sessionToken || req.headers.get("x-admin-token");
    if (!adminToken) {
      return new Response(
        JSON.stringify({ error: "Admin authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify admin session
    const { data: session, error: sessionError } = await supabase
      .from("admin_sessions")
      .select("admin_id, expires_at, is_valid")
      .eq("session_token", adminToken)
      .eq("is_valid", true)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: "Invalid admin session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Admin session expired" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // body already parsed above

    switch (action) {
      case "list": {
        // Fetch ALL sellers using service role (bypasses RLS)
        const { data: sellers, error } = await supabase
          .from("sellers")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching sellers:", error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, sellers }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "approve":
      case "reject":
      case "suspend":
      case "ban":
      case "unsuspend": {
        if (!sellerId) {
          return new Response(
            JSON.stringify({ error: "Seller ID required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get current seller data
        const { data: seller, error: sellerError } = await supabase
          .from("sellers")
          .select("*")
          .eq("id", sellerId)
          .single();

        if (sellerError || !seller) {
          return new Response(
            JSON.stringify({ error: "Seller not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        let newStatus: string;
        switch (action) {
          case "approve":
          case "unsuspend":
            newStatus = "approved";
            break;
          case "reject":
            newStatus = "rejected";
            break;
          case "suspend":
            newStatus = "suspended";
            break;
          case "ban":
            newStatus = "banned";
            break;
          default:
            newStatus = seller.status;
        }

        const updateData: Record<string, unknown> = {
          status: newStatus,
          updated_at: new Date().toISOString(),
        };

        if (action === "approve") {
          updateData.approved_at = new Date().toISOString();
          updateData.approved_by = adminId || session.admin_id;
          updateData.rejection_reason = null;
        }

        if (action === "reject" || action === "suspend" || action === "ban") {
          updateData.rejection_reason = reason || null;
        }

        if (action === "suspend") {
          updateData.warning_count = (seller.warning_count || 0) + 1;
        }

        const { error: updateError } = await supabase
          .from("sellers")
          .update(updateData)
          .eq("id", sellerId);

        if (updateError) {
          console.error("Error updating seller:", updateError);
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Log admin activity
        await supabase.from("admin_activity_logs").insert({
          admin_id: session.admin_id,
          action: `seller_${action}`,
          resource_type: "seller",
          resource_id: sellerId,
          details: { reason, previousStatus: seller.status, newStatus },
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Seller ${action}d successfully`,
            seller: { ...seller, status: newStatus }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Admin sellers error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
