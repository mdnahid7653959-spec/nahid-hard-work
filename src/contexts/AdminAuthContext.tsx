import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AdminUser {
  id: string;
  username: string;
  displayName: string;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  validateSession: () => Promise<boolean>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const ADMIN_SESSION_KEY = "megamart_admin_session";

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // Validate session with server - only called when needed
  const validateSession = useCallback(async (): Promise<boolean> => {
    const storedSession = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!storedSession) return false;

    try {
      const session = JSON.parse(storedSession);
      
      // Check client-side expiration first
      if (!session.token || !session.admin?.id || session.expiresAt <= Date.now()) {
        localStorage.removeItem(ADMIN_SESSION_KEY);
        setAdmin(null);
        return false;
      }

      // Try edge function validation
      try {
        const { data, error } = await supabase.functions.invoke("admin-auth", {
          body: { 
            action: "validate-session", 
            sessionToken: session.token,
            adminId: session.admin.id
          }
        });

        if (!error && data?.valid) {
          setAdmin(session.admin);
          return true;
        }

        if (data?.valid === false) {
          localStorage.removeItem(ADMIN_SESSION_KEY);
          setAdmin(null);
          return false;
        }
      } catch {
        // Edge function unavailable, proceed with valid local session
      }

      setAdmin(session.admin);
      return true;
    } catch {
      localStorage.removeItem(ADMIN_SESSION_KEY);
      setAdmin(null);
      return false;
    }
  }, []);

  // Check local session only (no server call) - used for initial mount
  const checkLocalSession = useCallback(() => {
    const storedSession = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!storedSession) {
      setAdmin(null);
      return false;
    }

    try {
      const session = JSON.parse(storedSession);
      
      // Check client-side expiration only
      if (!session.token || !session.admin?.id || session.expiresAt <= Date.now()) {
        localStorage.removeItem(ADMIN_SESSION_KEY);
        setAdmin(null);
        return false;
      }

      // Set admin from local storage without server validation
      setAdmin(session.admin);
      return true;
    } catch {
      localStorage.removeItem(ADMIN_SESSION_KEY);
      setAdmin(null);
      return false;
    }
  }, []);

  useEffect(() => {
    // On mount, only check local session (no server call)
    // Server validation happens on admin routes via AdminProtectedRoute
    const sessionExists = checkLocalSession();
    setLoading(false);
    // If already logged in, ensure Supabase Auth session is active for RLS
    if (sessionExists) {
      supabase.auth.getSession().then(({ data }) => {
        if (!data?.session) {
          supabase.auth.signInAnonymously().catch(() => {});
        }
      });
    }
  }, []); // Empty dependency - only run once on mount

  // Separate effect for periodic validation
  useEffect(() => {
    // Only set up interval if admin is logged in
    // and user is currently in the admin area.
    if (!admin) return;
    if (!location.pathname.startsWith("/admin")) return;
    
    const interval = setInterval(() => {
      validateSession();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [admin, location.pathname, validateSession]);

  // Helper: sign-in anonymously so auth.uid() is set and RLS policies pass
  const ensureSupabaseSession = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        await supabase.auth.signInAnonymously();
      }
    } catch {
      // Non-critical: if anonymous sign-in fails, DB operations may hit RLS
    }
  };

  const login = async (username: string, password: string) => {
    // 1. Try Edge Function invoke first
    try {
      const { data, error } = await supabase.functions.invoke("admin-auth", {
        body: { action: "login", username: username.trim(), password }
      });

      if (!error && data && !data.error && data.success) {
        const session = {
          admin: data.admin,
          token: data.token,
          expiresAt: new Date(data.expiresAt).getTime()
        };

        localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
        setAdmin(data.admin);
        // Ensure Supabase Auth session exists so RLS policies pass
        await ensureSupabaseSession();
        return { success: true };
      }

      if (data?.error) {
        return { success: false, error: data.error };
      }
    } catch {
      // Edge function failed or is not deployed on this instance, fall through to client fallback
    }

    // 2. Database Fallback (direct query against admin_credentials)
    try {
      const trimmedUser = username.trim();
      const { data: adminRecord, error: dbError } = await supabase
        .from("admin_credentials")
        .select("id, username, display_name, is_active, password_hash")
        .ilike("username", trimmedUser)
        .eq("is_active", true)
        .maybeSingle();

      if (dbError || !adminRecord) {
        return { success: false, error: "Invalid admin username or password" };
      }

      // Verify SHA256 hex or PBKDF2 hash
      const providedPassword = (password || "").toString();
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(providedPassword));
      const hexHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

      let isValid = hexHash === adminRecord.password_hash;

      if (!isValid && adminRecord.password_hash?.startsWith("pbkdf2$")) {
        try {
          const parts = adminRecord.password_hash.split("$");
          if (parts.length === 4) {
            const iterations = parseInt(parts[1], 10);
            const saltBinary = atob(parts[2]);
            const salt = new Uint8Array(saltBinary.length);
            for (let i = 0; i < saltBinary.length; i++) salt[i] = saltBinary.charCodeAt(i);

            const hashBinary = atob(parts[3]);
            const expectedHash = new Uint8Array(hashBinary.length);
            for (let i = 0; i < hashBinary.length; i++) expectedHash[i] = hashBinary.charCodeAt(i);

            const keyMaterial = await crypto.subtle.importKey(
              "raw",
              encoder.encode(providedPassword),
              { name: "PBKDF2" },
              false,
              ["deriveBits"]
            );

            const bits = await crypto.subtle.deriveBits(
              { name: "PBKDF2", hash: "SHA-256", iterations, salt },
              keyMaterial,
              256
            );
            const computedHash = new Uint8Array(bits);

            if (computedHash.length === expectedHash.length) {
              let diff = 0;
              for (let i = 0; i < computedHash.length; i++) diff |= computedHash[i] ^ expectedHash[i];
              isValid = diff === 0;
            }
          }
        } catch {
          isValid = false;
        }
      }

      if (!isValid) {
        return { success: false, error: "Invalid admin username or password" };
      }

      const adminObj = {
        id: adminRecord.id,
        username: adminRecord.username,
        displayName: adminRecord.display_name || adminRecord.username
      };

      // Generate cryptographically secure 256-bit session token
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      const secureToken = "sec_admin_" + Array.from(randomBytes, b => b.toString(16).padStart(2, "0")).join("") + "_" + Date.now().toString(36);

      const session = {
        admin: adminObj,
        token: secureToken,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
      };

      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
      setAdmin(adminObj);
      // Ensure Supabase Auth session exists so RLS policies pass
      await ensureSupabaseSession();
      return { success: true };
    } catch (fallbackError: any) {
      return { success: false, error: fallbackError.message || "Login failed" };
    }
  };

  const logout = async () => {
    const storedSession = localStorage.getItem(ADMIN_SESSION_KEY);
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession);
        // Invalidate session on server
        await supabase.functions.invoke("admin-auth", {
          body: { action: "logout", sessionToken: session.token }
        });
      } catch {
        // Continue with local logout even if server call fails
      }
    }
    
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setAdmin(null);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!admin) {
      return { success: false, error: "Not authenticated" };
    }

    // Client-side validation
    if (newPassword.length < 12) {
      return { success: false, error: "Password must be at least 12 characters" };
    }

    try {
      const { data, error } = await supabase.functions.invoke("admin-auth", {
        body: { 
          action: "change-password", 
          username: admin.username, 
          password: currentPassword,
          newPassword 
        }
      });

      if (error || data?.error) {
        return { success: false, error: data?.error || error?.message || "Failed to change password" };
      }

      // Force re-login after password change
      await logout();

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Failed to change password" };
    }
  };

  return (
    <AdminAuthContext.Provider value={{
      admin,
      isAuthenticated: !!admin,
      loading,
      login,
      logout,
      changePassword,
      validateSession
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}
