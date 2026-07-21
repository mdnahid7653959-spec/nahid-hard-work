// Admin-only staff management edge function.
// Uses the admin session (from AdminAuthContext) OR a valid Supabase user JWT that has role='admin'.
// For simplicity here we require an X-Admin-Token header validated by looking up admin_sessions.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
}

async function verifyAdmin(req: Request): Promise<{ ok: boolean; adminId?: string; error?: string }> {
  const token = req.headers.get("x-admin-token");
  const auth = req.headers.get("authorization");
  const sb = admin();

  // Path A: admin session token (from admin-auth edge function)
  if (token) {
    const { data } = await sb
      .from("admin_sessions")
      .select("id, admin_id, expires_at, is_valid")
      .eq("session_token", token)
      .eq("is_valid", true)
      .maybeSingle();
    if (data && new Date(data.expires_at) > new Date()) {
      // Confirm admin account is still active
      const { data: adm } = await sb
        .from("admin_credentials")
        .select("id")
        .eq("id", data.admin_id)
        .eq("is_active", true)
        .maybeSingle();
      if (adm) return { ok: true, adminId: data.admin_id };
    }
  }

  // Path B: authenticated supabase user with role='admin'
  if (auth?.startsWith("Bearer ")) {
    const userJwt = auth.slice(7);
    const client = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${userJwt}` } },
    });
    const { data: userData } = await client.auth.getUser();
    if (userData?.user) {
      const { data: hasAdmin } = await sb.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
      if (hasAdmin) return { ok: true, adminId: userData.user.id };
    }
  }
  return { ok: false, error: "unauthorized" };
}

async function logAudit(sb: any, actorId: string | undefined, staffId: string | null, action: string, meta: any = {}) {
  await sb.from("staff_audit_logs").insert({ actor_user_id: actorId, staff_id: staffId, action, metadata: meta });
}

function randomToken(len = 48) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await verifyAdmin(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const sb = admin();
    const body = await req.json();
    const action = body.action as string;

    switch (action) {
      case "list_staff": {
        const { data, error } = await sb
          .from("staff_members")
          .select("*, staff_departments(name), staff_roles(name, dashboard_key, default_permissions)")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return json({ data });
      }
      case "list_departments": {
        const { data, error } = await sb.from("staff_departments").select("*, staff_roles(*)").order("name");
        if (error) throw error;
        return json({ data });
      }
      case "list_roles": {
        const { data, error } = await sb.from("staff_roles").select("*").order("name");
        if (error) throw error;
        return json({ data });
      }
      case "create_staff": {
        const {
          full_name, email, phone, department_id, role_id,
          monthly_salary, joining_date, permissions = [], site_url,
        } = body;
        if (!full_name || !email || !role_id) return json({ error: "missing fields" }, 400);

        const { data: staff, error } = await sb.from("staff_members").insert({
          full_name, email: email.toLowerCase(), phone, department_id, role_id,
          monthly_salary, joining_date, invited_by: auth.adminId, status: "invited",
        }).select().single();
        if (error) throw error;

        // add extra permissions
        if (Array.isArray(permissions) && permissions.length) {
          await sb.from("staff_permissions").insert(
            permissions.map((k: string) => ({ staff_id: staff.id, permission_key: k, granted_by: auth.adminId }))
          );
        }

        // create invitation token
        const token = randomToken(32);
        const token_hash = await sha256(token);
        const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await sb.from("staff_invitations").insert({ staff_id: staff.id, token_hash, expires_at });

        const activationUrl = `${site_url || "https://durtup.shop"}/staff/activate?token=${token}`;

        // Best-effort email via existing transactional infra (ignore failures)
        try {
          await sb.functions.invoke("send-transactional-email", {
            body: {
              templateName: "staff-invitation",
              recipientEmail: email,
              idempotencyKey: `staff-invite-${staff.id}`,
              templateData: { name: full_name, activationUrl },
            },
          });
        } catch (_) { /* email optional */ }

        await logAudit(sb, auth.adminId, staff.id, "staff.created", { email });
        return json({ data: staff, activationUrl });
      }
      case "resend_invite": {
        const { staff_id, site_url } = body;
        const { data: staff, error: se } = await sb.from("staff_members").select("*").eq("id", staff_id).single();
        if (se) throw se;
        const token = randomToken(32);
        const token_hash = await sha256(token);
        const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await sb.from("staff_invitations").insert({ staff_id, token_hash, expires_at });
        const activationUrl = `${site_url || "https://durtup.shop"}/staff/activate?token=${token}`;
        try {
          await sb.functions.invoke("send-transactional-email", {
            body: { templateName: "staff-invitation", recipientEmail: staff.email, idempotencyKey: `staff-invite-${staff_id}-${Date.now()}`, templateData: { name: staff.full_name, activationUrl } },
          });
        } catch (_) {}
        await logAudit(sb, auth.adminId, staff_id, "staff.invite_resent");
        return json({ activationUrl });
      }
      case "update_staff": {
        const { staff_id, updates = {}, permissions } = body;
        const { error } = await sb.from("staff_members").update(updates).eq("id", staff_id);
        if (error) throw error;
        if (Array.isArray(permissions)) {
          await sb.from("staff_permissions").delete().eq("staff_id", staff_id);
          if (permissions.length) {
            await sb.from("staff_permissions").insert(permissions.map((k: string) => ({ staff_id, permission_key: k, granted_by: auth.adminId })));
          }
        }
        await logAudit(sb, auth.adminId, staff_id, "staff.updated", { updates });
        return json({ ok: true });
      }
      case "set_status": {
        const { staff_id, status } = body;
        const { error } = await sb.from("staff_members").update({ status }).eq("id", staff_id);
        if (error) throw error;
        // also remove staff role if suspended/deleted
        if (status !== "active") {
          const { data: sm } = await sb.from("staff_members").select("user_id").eq("id", staff_id).single();
          if (sm?.user_id) await sb.from("user_roles").delete().eq("user_id", sm.user_id).eq("role", "staff");
        }
        await logAudit(sb, auth.adminId, staff_id, "staff.status_changed", { status });
        return json({ ok: true });
      }
      case "assign_task": {
        const { staff_id, title, description, priority, due_date } = body;
        const { data, error } = await sb.from("staff_tasks").insert({
          staff_id, title, description, priority: priority || "normal", due_date, assigned_by: auth.adminId,
        }).select().single();
        if (error) throw error;
        await logAudit(sb, auth.adminId, staff_id, "task.assigned", { task_id: data.id, title });
        return json({ data });
      }
      case "list_tasks": {
        const { staff_id } = body;
        const q = sb.from("staff_tasks").select("*").order("created_at", { ascending: false });
        const { data, error } = staff_id ? await q.eq("staff_id", staff_id) : await q;
        if (error) throw error;
        return json({ data });
      }
      case "send_message": {
        const { staff_id, subject, body: text } = body;
        const { data, error } = await sb.from("staff_messages").insert({
          to_staff_id: staff_id, subject, body: text, from_admin_id: auth.adminId,
        }).select().single();
        if (error) throw error;
        await logAudit(sb, auth.adminId, staff_id, "message.sent", { message_id: data.id });
        return json({ data });
      }
      case "list_audit": {
        const { staff_id } = body;
        const q = sb.from("staff_audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
        const { data, error } = staff_id ? await q.eq("staff_id", staff_id) : await q;
        if (error) throw error;
        return json({ data });
      }
      case "upsert_department": {
        const { id, name, description, is_active = true } = body;
        const payload = { name, description, is_active };
        const { data, error } = id
          ? await sb.from("staff_departments").update(payload).eq("id", id).select().single()
          : await sb.from("staff_departments").insert(payload).select().single();
        if (error) throw error;
        return json({ data });
      }
      case "upsert_role": {
        const { id, department_id, name, description, default_permissions = [], dashboard_key = "general", is_active = true } = body;
        const payload = { department_id, name, description, default_permissions, dashboard_key, is_active };
        const { data, error } = id
          ? await sb.from("staff_roles").update(payload).eq("id", id).select().single()
          : await sb.from("staff_roles").insert(payload).select().single();
        if (error) throw error;
        return json({ data });
      }
      default:
        return json({ error: "unknown action" }, 400);
    }
  } catch (e: any) {
    console.error("staff-admin error", e);
    return json({ error: e?.message || "server error" }, 500);
  }
});

function json(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
