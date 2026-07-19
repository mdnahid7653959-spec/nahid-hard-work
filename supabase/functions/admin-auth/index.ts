import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate secure session token
function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizeUsername(username: string): string {
  return (username || "").trim();
}

function usernameLookupKey(username: string): string {
  return normalizeUsername(username).replace(/\s+/g, "").toLowerCase();
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function invalidCredentialsResponse() {
  // Keep credential failures as handled app-level errors so the browser
  // does not surface them as Edge Function runtime failures.
  return json({ success: false, error: "Invalid credentials" });
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(input: string): Uint8Array {
  const binary = atob(input);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Edge-friendly password hashing (PBKDF2)
const PBKDF2_ITERATIONS = 150_000;
const PBKDF2_HASH = "SHA-256";

async function pbkdf2Hash(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: PBKDF2_HASH, iterations: PBKDF2_ITERATIONS, salt: salt as unknown as BufferSource },
    keyMaterial,
    256,
  );

  return new Uint8Array(bits);
}

function formatPbkdf2Hash(iterations: number, salt: Uint8Array, hash: Uint8Array): string {
  return `pbkdf2$${iterations}$${toBase64(salt)}$${toBase64(hash)}`;
}

function parsePbkdf2Hash(stored: string): { iterations: number; salt: Uint8Array; hash: Uint8Array } | null {
  const parts = stored.split("$");
  if (parts.length !== 4) return null;
  if (parts[0] !== "pbkdf2") return null;
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations < 50_000) return null;
  return {
    iterations,
    salt: fromBase64(parts[2]),
    hash: fromBase64(parts[3]),
  };
}

async function verifyAndMaybeUpgradePassword(
  providedPassword: string,
  storedHash: string,
): Promise<{ valid: boolean; upgradedHash?: string }> {
  // New format
  if (storedHash?.startsWith("pbkdf2$")) {
    const parsed = parsePbkdf2Hash(storedHash);
    if (!parsed) return { valid: false };

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(providedPassword),
      { name: "PBKDF2" },
      false,
      ["deriveBits"],
    );

    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", iterations: parsed.iterations, salt: parsed.salt as unknown as BufferSource },
      keyMaterial,
      256,
    );

    const computed = new Uint8Array(bits);
    return { valid: constantTimeEqual(computed, parsed.hash) };
  }

  // Legacy SHA-256 hex (64 chars)
  const sha = await sha256Hex(providedPassword);
  if (sha === storedHash) {
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    const hash = await pbkdf2Hash(providedPassword, salt);
    const upgradedHash = formatPbkdf2Hash(PBKDF2_ITERATIONS, salt, hash);
    return { valid: true, upgradedHash };
  }

  return { valid: false };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, username, password, newPassword, sessionToken, adminId } = await req.json();
    const normalizedUsername = normalizeUsername(username);

    // Validate session token for protected actions
    if (action === "validate-session") {
      if (!sessionToken || !adminId) {
        return new Response(
          JSON.stringify({ valid: false, error: "Missing session data" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: session, error: sessionError } = await supabase
        .from("admin_sessions")
        .select("id, admin_id")
        .eq("session_token", sessionToken)
        .eq("admin_id", adminId)
        .eq("is_valid", true)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (sessionError || !session) {
        return new Response(
          JSON.stringify({ valid: false, error: "Invalid or expired session" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: admin, error: adminError } = await supabase
        .from("admin_credentials")
        .select("id, username, display_name, is_active")
        .eq("id", session.admin_id)
        .eq("is_active", true)
        .maybeSingle();

      if (adminError || !admin) {
        return new Response(
          JSON.stringify({ valid: false, error: "Admin account is inactive or missing" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }


      // Extend session if it's valid
      await supabase
        .from("admin_sessions")
        .update({ last_activity: new Date().toISOString() })
        .eq("id", session.id);

      return new Response(
        JSON.stringify({
          valid: true,
          admin: {
            id: admin.id,
            username: admin.username,
            displayName: admin.display_name,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "login") {
      // Fetch active admin credentials using service role (bypasses RLS).
      // Match in code so login is tolerant of accidental case/space variation.
      const { data: admins, error: fetchError } = await supabase
        .from("admin_credentials")
        .select("*")
        .eq("is_active", true);

      const requestedUsernameKey = usernameLookupKey(normalizedUsername);
      const admin = Array.isArray(admins)
        ? admins.find((candidate) => usernameLookupKey(candidate.username) === requestedUsernameKey)
        : null;

      if (fetchError || !admin) {
        return invalidCredentialsResponse();
      }

      const providedPassword = (password || "").toString();

      const verify = await verifyAndMaybeUpgradePassword(providedPassword, admin.password_hash);

      if (!verify.valid) {
        return invalidCredentialsResponse();
      }

      // Upgrade legacy hash to PBKDF2
      if (verify.upgradedHash) {
        await supabase
          .from("admin_credentials")
          .update({ password_hash: verify.upgradedHash, updated_at: new Date().toISOString() })
          .eq("id", admin.id);
      }

      // Generate secure session token
      const newSessionToken = generateSessionToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Invalidate old sessions for this admin
      await supabase
        .from("admin_sessions")
        .update({ is_valid: false })
        .eq("admin_id", admin.id);

      // Create new session in database
      const { error: sessionError } = await supabase
        .from("admin_sessions")
        .insert({
          admin_id: admin.id,
          session_token: newSessionToken,
          expires_at: expiresAt.toISOString(),
          ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown",
          user_agent: req.headers.get("user-agent") || "unknown"
        });

      if (sessionError) {
        console.error("Session creation error:", sessionError);
        return new Response(
          JSON.stringify({ error: "Failed to create session" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update last login
      await supabase
        .from("admin_credentials")
        .update({ last_login: new Date().toISOString() })
        .eq("id", admin.id);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          admin: {
            id: admin.id,
            username: admin.username,
            displayName: admin.display_name
          },
          token: newSessionToken,
          expiresAt: expiresAt.toISOString()
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "logout") {
      if (sessionToken) {
        await supabase
          .from("admin_sessions")
          .update({ is_valid: false })
          .eq("session_token", sessionToken);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Logged out successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "change-password") {
      // Verify current password first
      const { data: admin, error: fetchError } = await supabase
        .from("admin_credentials")
        .select("*")
        .eq("username", normalizedUsername)
        .single();

      if (fetchError || !admin) {
        return new Response(
          JSON.stringify({ error: "Admin not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const currentPassword = (password || "").toString();

      const verify = await verifyAndMaybeUpgradePassword(currentPassword, admin.password_hash);

      if (!verify.valid) {
        return new Response(
          JSON.stringify({ error: "Current password is incorrect" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate new password strength
      if (!newPassword || newPassword.length < 12) {
        return new Response(
          JSON.stringify({ error: "New password must be at least 12 characters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Hash new password with PBKDF2
      const salt = new Uint8Array(16);
      crypto.getRandomValues(salt);
      const derived = await pbkdf2Hash(newPassword, salt);
      const newHash = formatPbkdf2Hash(PBKDF2_ITERATIONS, salt, derived);

      // Update password
      const { error: updateError } = await supabase
        .from("admin_credentials")
        .update({ 
          password_hash: newHash,
          updated_at: new Date().toISOString()
        })
        .eq("id", admin.id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Failed to update password" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Invalidate all sessions after password change
      await supabase
        .from("admin_sessions")
        .update({ is_valid: false })
        .eq("admin_id", admin.id);

      return new Response(
        JSON.stringify({ success: true, message: "Password updated successfully. Please login again." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Admin auth error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
