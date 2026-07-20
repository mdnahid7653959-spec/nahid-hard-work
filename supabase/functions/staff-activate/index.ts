// Validate a staff invitation token and set the staff account password.
// Creates the auth.users record if not present, links it to staff_members,
// and grants the 'staff' role in user_roles.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  try {
    const { action, token, password } = await req.json();
    if (!token) return json({ error: "missing token" }, 400);
    const token_hash = await sha256(token);
    const { data: inv } = await sb.from("staff_invitations").select("*").eq("token_hash", token_hash).maybeSingle();
    if (!inv) return json({ error: "invalid token" }, 400);
    if (inv.consumed_at) return json({ error: "token already used" }, 400);
    if (new Date(inv.expires_at) < new Date()) return json({ error: "token expired" }, 400);

    const { data: staff } = await sb.from("staff_members").select("*").eq("id", inv.staff_id).single();
    if (!staff) return json({ error: "staff not found" }, 404);
    if (staff.status === "suspended" || staff.status === "deleted") return json({ error: "account not active" }, 403);

    if (action === "check") {
      return json({ email: staff.email, full_name: staff.full_name });
    }

    // action === 'activate'
    if (!password || password.length < 8) return json({ error: "password must be at least 8 characters" }, 400);

    // Find or create auth user
    let userId = staff.user_id as string | null;
    if (!userId) {
      // try to find existing user by email
      const { data: list } = await sb.auth.admin.listUsers();
      const existing = list?.users?.find((u) => u.email?.toLowerCase() === staff.email.toLowerCase());
      if (existing) {
        userId = existing.id;
        await sb.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
      } else {
        const { data: created, error: ce } = await sb.auth.admin.createUser({
          email: staff.email, password, email_confirm: true, user_metadata: { full_name: staff.full_name, is_staff: true },
        });
        if (ce) throw ce;
        userId = created.user!.id;
      }
    } else {
      await sb.auth.admin.updateUserById(userId, { password, email_confirm: true });
    }

    // Update staff member
    await sb.from("staff_members").update({ user_id: userId, status: "active", activated_at: new Date().toISOString() }).eq("id", staff.id);

    // Grant staff role
    await sb.from("user_roles").upsert({ user_id: userId, role: "staff" }, { onConflict: "user_id,role" });

    // Consume invitation
    await sb.from("staff_invitations").update({ consumed_at: new Date().toISOString() }).eq("id", inv.id);

    await sb.from("staff_audit_logs").insert({ staff_id: staff.id, actor_user_id: userId, action: "staff.activated" });

    return json({ ok: true, email: staff.email });
  } catch (e: any) {
    console.error("staff-activate error", e);
    return json({ error: e?.message || "server error" }, 500);
  }
});

function json(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
