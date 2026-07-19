// Generic admin data-access edge function.
// Verifies adminId against admin_credentials, then performs whitelisted CRUD
// against the DB using the service-role client. This unblocks all admin pages
// that use custom (non-Supabase-auth) sessions.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tables the admin panel is allowed to touch through this generic router.
// Keep this tight — anything not listed here returns 400.
const ALLOWED_TABLES = new Set<string>([
  "categories",
  "brands",
  "coupons",
  "profiles",
  "user_roles",
  "addresses",
  "free_delivery_rules",
  "shipping_zones",
  "shipping_rates",
  "loyalty_rewards",
  "loyalty_points",
  "wallet_transactions",
  "category_commissions",
  "seller_earnings",
  "seller_payouts",
  "reviews",
  "cms_pages",
  "cms_banners",
  "blog_posts",
  "custom_sections",
  "campaigns",
  "inventory_alerts",
  "inventory_logs",
  "product_variants",
  "product_images",
  "admin_activity_logs",
  "orders",
  "order_items",
  "products",
  "sellers",
  "consignments",
  "notifications",
  "push_notifications",
  "site_settings",
  "site_config",
  "warehouses",
  "conversations",
  "messages",
  "cj_settings",
  "cj_category_mappings",
]);

const ALLOWED_OPS = new Set(["select", "insert", "update", "delete", "upsert", "count"]);

const FILTER_OPS = new Set([
  "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "ilike", "like", "contains",
]);

async function verifyAdmin(supabase: any, adminId: string): Promise<boolean> {
  if (!adminId || typeof adminId !== "string") return false;
  const { data, error } = await supabase
    .from("admin_credentials")
    .select("id")
    .eq("id", adminId)
    .eq("is_active", true)
    .maybeSingle();
  return !error && !!data;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function applyFilters(query: any, filters: any[]) {
  if (!Array.isArray(filters)) return query;
  for (const f of filters) {
    if (!f || typeof f.col !== "string") continue;
    const op = String(f.op || "eq");
    if (!FILTER_OPS.has(op)) continue;
    // @ts-ignore dynamic
    query = query[op](f.col, f.value);
  }
  return query;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const { adminId, op, table } = body as {
      adminId?: string; op?: string; table?: string;
    };

    if (!(await verifyAdmin(supabase, adminId ?? ""))) {
      return json({ error: "Unauthorized" }, 401);
    }

    if (!op || !ALLOWED_OPS.has(op)) return json({ error: "Invalid op" }, 400);
    if (!table || !ALLOWED_TABLES.has(table)) return json({ error: `Table not allowed: ${table}` }, 400);

    const {
      columns = "*",
      filters = [],
      orderBy,
      limit,
      values,
      id,
      idColumn = "id",
      count,
    } = body as any;

    if (op === "select" || op === "count") {
      let q = supabase.from(table).select(columns, count ? { count: "exact" } : undefined);
      q = applyFilters(q, filters);
      if (orderBy?.col) q = q.order(orderBy.col, { ascending: orderBy.ascending !== false });
      if (typeof limit === "number") q = q.limit(limit);
      const { data, error, count: rowCount } = await q;
      if (error) return json({ error: error.message }, 400);
      return json({ data, count: rowCount ?? null });
    }

    if (op === "insert") {
      if (!values) return json({ error: "values required" }, 400);
      const { data, error } = await supabase.from(table).insert(values).select();
      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }

    if (op === "upsert") {
      if (!values) return json({ error: "values required" }, 400);
      const { data, error } = await supabase.from(table).upsert(values).select();
      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }

    if (op === "update") {
      if (!values) return json({ error: "values required" }, 400);
      let q = supabase.from(table).update(values);
      if (id !== undefined) q = q.eq(idColumn, id);
      else q = applyFilters(q, filters);
      const { data, error } = await q.select();
      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }

    if (op === "delete") {
      let q = supabase.from(table).delete();
      if (id !== undefined) q = q.eq(idColumn, id);
      else q = applyFilters(q, filters);
      const { error } = await q;
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    return json({ error: "Unhandled op" }, 400);
  } catch (e: any) {
    console.error("admin-db error", e);
    return json({ error: e?.message || "Internal error" }, 500);
  }
});
