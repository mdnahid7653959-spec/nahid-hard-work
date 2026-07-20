import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-requested-with, content-type, x-admin-token",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// --- Validation helpers ---
const SAFE_URL_RE = /^(https?:\/\/|\/)/i;
const UNSAFE_URL_RE = /^\s*(javascript|data|vbscript|file):/i;
function isSafeUrl(u: unknown): boolean {
  if (u === undefined || u === null || u === "") return true;
  if (typeof u !== "string" || u.length > 2048) return false;
  if (UNSAFE_URL_RE.test(u)) return false;
  return SAFE_URL_RE.test(u);
}
function isStr(v: unknown, max = 500): boolean {
  return v === undefined || v === null || (typeof v === "string" && v.length <= max);
}
function validateTile(t: any, i: number): string | null {
  if (!t || typeof t !== "object") return `tile[${i}] not object`;
  if (typeof t.id !== "string" || t.id.length > 64) return `tile[${i}].id invalid`;
  if (typeof t.visible !== "boolean") return `tile[${i}].visible invalid`;
  if (!isStr(t.title, 300) || !isStr(t.subtitle, 1000) || !isStr(t.label, 200)) return `tile[${i}] text too long`;
  if (!isStr(t.badge, 200) || !isStr(t.ctaText, 200)) return `tile[${i}] cta/badge too long`;
  if (!isSafeUrl(t.link)) return `tile[${i}].link unsafe`;
  if (!isSafeUrl(t.imageUrl)) return `tile[${i}].imageUrl unsafe`;
  return null;
}
function validateSection(s: any, i: number): string | null {
  if (!s || typeof s !== "object") return `section[${i}] not object`;
  if (typeof s.id !== "string" || s.id.length > 64) return `section[${i}].id invalid`;
  if (typeof s.visible !== "boolean") return `section[${i}].visible invalid`;
  if (!isStr(s.title, 300) || !isStr(s.subtitle, 1000)) return `section[${i}] text too long`;
  if (!isSafeUrl(s.link) || !isSafeUrl(s.imageUrl)) return `section[${i}] unsafe url`;
  return null;
}
function validateHomeBento(v: any): string | null {
  if (!v || typeof v !== "object") return "root not object";
  if (!Array.isArray(v.tiles)) return "tiles must be array";
  if (v.tiles.length > 64) return "too many tiles";
  for (let i = 0; i < v.tiles.length; i++) { const e = validateTile(v.tiles[i], i); if (e) return e; }
  if (v.sections !== undefined) {
    if (!Array.isArray(v.sections)) return "sections must be array";
    if (v.sections.length > 64) return "too many sections";
    for (let i = 0; i < v.sections.length; i++) { const e = validateSection(v.sections[i], i); if (e) return e; }
  }
  if (v.mobile !== undefined && v.mobile !== null) {
    if (typeof v.mobile !== "object") return "mobile must be object";
    if (v.mobile.tiles !== undefined) {
      if (!Array.isArray(v.mobile.tiles) || v.mobile.tiles.length > 64) return "mobile.tiles invalid";
      for (let i = 0; i < v.mobile.tiles.length; i++) { const e = validateTile(v.mobile.tiles[i], i); if (e) return `mobile.${e}`; }
    }
    if (v.mobile.sections !== undefined) {
      if (!Array.isArray(v.mobile.sections) || v.mobile.sections.length > 64) return "mobile.sections invalid";
      for (let i = 0; i < v.mobile.sections.length; i++) { const e = validateSection(v.mobile.sections[i], i); if (e) return `mobile.${e}`; }
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Public read for site-config (no admin token needed)
    if (req.method === "GET" && action === "site-config") {
      const key = url.searchParams.get("key");
      if (!key) return jsonResponse({ error: "Missing key" }, 400);
      const { data } = await supabase.from("site_config").select("*").eq("key", key).maybeSingle();
      return jsonResponse({ data });
    }

    // Validate admin session for all other actions
    const adminToken = req.headers.get("x-admin-token");
    if (!adminToken) return jsonResponse({ error: "Unauthorized" }, 401);

    const { data: session } = await supabase
      .from("admin_sessions")
      .select("admin_id")
      .eq("session_token", adminToken)
      .eq("is_valid", true)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (!session) return jsonResponse({ error: "Invalid session" }, 401);

    // === GET handlers ===
    if (req.method === "GET") {
      if (action === "theme") {
        const { data } = await supabase.from("theme_config").select("*").eq("is_active", true).maybeSingle();
        return jsonResponse({ data });
      }
      if (action === "layout") {
        const page = url.searchParams.get("page") || "homepage";
        const { data } = await supabase.from("layout_config").select("*").eq("page", page).maybeSingle();
        return jsonResponse({ data });
      }
      if (action === "versions") {
        const { data } = await supabase.from("theme_versions").select("*").order("created_at", { ascending: false }).limit(50);
        return jsonResponse({ data });
      }
      if (action === "custom-sections") {
        const { data } = await supabase.from("custom_sections").select("*").order("created_at", { ascending: false });
        return jsonResponse({ data });
      }
      if (action === "all-site-config") {
        const { data } = await supabase.from("site_config").select("*");
        return jsonResponse({ data });
      }
    }

    // === POST handlers ===
    if (req.method === "POST") {
      const body = await req.json();

      // Site config upsert
      if (action === "save-site-config") {
        const { key, value } = body;
        if (!key || typeof key !== "string" || key.length > 64) {
          return jsonResponse({ error: "Invalid key" }, 400);
        }
        // Payload size guard (~256 KB after serialization)
        let serialized: string;
        try { serialized = JSON.stringify(value); } catch { return jsonResponse({ error: "Invalid value" }, 400); }
        if (!serialized || serialized.length > 256 * 1024) {
          return jsonResponse({ error: "Payload too large" }, 413);
        }
        // Schema validation for home_bento
        if (key === "home_bento") {
          const err = validateHomeBento(value);
          if (err) return jsonResponse({ error: `Invalid home_bento: ${err}` }, 400);
        }
        const { data, error } = await supabase
          .from("site_config")
          .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" })
          .select().single();
        if (error) throw error;
        return jsonResponse({ data });
      }

      if (action === "theme") {
        await supabase.from("theme_config").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");
        const { data, error } = await supabase
          .from("theme_config")
          .upsert({ id: body.id || undefined, config: body.config, is_active: true, updated_at: new Date().toISOString() })
          .select().single();
        if (error) throw error;
        return jsonResponse({ data });
      }

      if (action === "layout") {
        const page = body.page || "homepage";
        const { data, error } = await supabase
          .from("layout_config")
          .upsert({ page, sections: body.sections, updated_at: new Date().toISOString() }, { onConflict: "page" })
          .select().single();
        if (error) throw error;
        return jsonResponse({ data });
      }

      if (action === "save-version") {
        const { data, error } = await supabase
          .from("theme_versions")
          .insert({ name: body.name, theme_config: body.theme_config, layout_config: body.layout_config })
          .select().single();
        if (error) throw error;
        return jsonResponse({ data });
      }

      if (action === "restore-version") {
        const { data: version } = await supabase.from("theme_versions").select("*").eq("id", body.id).single();
        if (!version) throw new Error("Version not found");

        await supabase.from("theme_config").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("theme_config").upsert({ config: version.theme_config, is_active: true, updated_at: new Date().toISOString() });

        if (version.layout_config && Object.keys(version.layout_config as object).length > 0) {
          const layoutConfig = version.layout_config as Record<string, unknown>;
          const sections = layoutConfig.sections || layoutConfig;
          await supabase.from("layout_config").upsert({ page: "homepage", sections, updated_at: new Date().toISOString() }, { onConflict: "page" });
        }
        return jsonResponse({ success: true });
      }

      if (action === "delete-version") {
        const { error } = await supabase.from("theme_versions").delete().eq("id", body.id);
        if (error) throw error;
        return jsonResponse({ success: true });
      }

      // Custom sections CRUD
      if (action === "create-custom-section") {
        const { data, error } = await supabase
          .from("custom_sections")
          .insert({ type: body.type, title: body.title, config: body.config || {} })
          .select().single();
        if (error) throw error;
        return jsonResponse({ data });
      }

      if (action === "update-custom-section") {
        const { data, error } = await supabase
          .from("custom_sections")
          .update({ title: body.title, config: body.config, type: body.type, updated_at: new Date().toISOString() })
          .eq("id", body.id)
          .select().single();
        if (error) throw error;
        return jsonResponse({ data });
      }

      if (action === "delete-custom-section") {
        const { error } = await supabase.from("custom_sections").delete().eq("id", body.id);
        if (error) throw error;
        return jsonResponse({ success: true });
      }
    }

    return jsonResponse({ error: "Invalid action" }, 400);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
});
