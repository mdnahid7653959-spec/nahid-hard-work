import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function loadStaffPermissions(supabase: any, userId: string) {
  const { data: sm } = await supabase
    .from("staff_members")
    .select("id, status, role_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!sm || sm.status !== "active") return null;
  const perms = new Set<string>();
  if (sm.role_id) {
    const { data: role } = await supabase
      .from("staff_roles")
      .select("default_permissions")
      .eq("id", sm.role_id)
      .maybeSingle();
    (role?.default_permissions || []).forEach((k: string) => perms.add(k));
  }
  const { data: extra } = await supabase
    .from("staff_permissions")
    .select("permission_key")
    .eq("staff_id", sm.id);
  (extra || []).forEach((p: any) => perms.add(p.permission_key));
  return { staffId: sm.id, permissions: perms };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return jsonResp({ error: "Missing auth token" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return jsonResp({ error: "Invalid session" }, 401);

    const staff = await loadStaffPermissions(admin, userData.user.id);
    if (!staff) return jsonResp({ error: "Not a staff member" }, 403);

    const { action, productId, reason } = await req.json();

    const needs = (key: string) => staff.permissions.has(key);

    if (action === "list") {
      if (!needs("products.view") && !needs("products.approve") && !needs("products.manage")) {
        return jsonResp({ error: "Missing permission" }, 403);
      }
      const { data, error } = await admin
        .from("products")
        .select("id, name, slug, regular_price, discount_price, stock_quantity, status, approval_status, seller_id, is_featured, created_at, sellers(shop_name)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) return jsonResp({ error: error.message }, 400);
      return jsonResp({ success: true, products: data });
    }

    if (!productId) return jsonResp({ error: "Product ID required" }, 400);

    if (action === "approve") {
      if (!needs("products.approve")) return jsonResp({ error: "Missing permission" }, 403);
      const { data, error } = await admin
        .from("products")
        .update({ approval_status: "approved", approved_at: new Date().toISOString(), status: "active" })
        .eq("id", productId).select().single();
      if (error) return jsonResp({ error: error.message }, 400);
      return jsonResp({ success: true, product: data });
    }

    if (action === "reject") {
      if (!needs("products.approve")) return jsonResp({ error: "Missing permission" }, 403);
      const { data, error } = await admin
        .from("products")
        .update({ approval_status: "rejected", rejection_reason: reason || null, status: "inactive" })
        .eq("id", productId).select().single();
      if (error) return jsonResp({ error: error.message }, 400);
      return jsonResp({ success: true, product: data });
    }

    if (action === "ban") {
      if (!needs("products.approve") && !needs("products.manage")) return jsonResp({ error: "Missing permission" }, 403);
      const { data, error } = await admin
        .from("products")
        .update({ approval_status: "banned", rejection_reason: reason || null, status: "inactive" })
        .eq("id", productId).select().single();
      if (error) return jsonResp({ error: error.message }, 400);
      return jsonResp({ success: true, product: data });
    }

    return jsonResp({ error: "Unknown action" }, 400);
  } catch (e: any) {
    return jsonResp({ error: e?.message || "Server error" }, 500);
  }
});
