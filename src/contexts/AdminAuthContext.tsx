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

      // Validate with server
      const { data, error } = await supabase.functions.invoke("admin-auth", {
        body: { 
          action: "validate-session", 
          sessionToken: session.token,
          adminId: session.admin.id
        }
      });

      if (error || !data?.valid) {
        localStorage.removeItem(ADMIN_SESSION_KEY);
        setAdmin(null);
        return false;
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
    checkLocalSession();
    setLoading(false);
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

  const login = async (username: string, password: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-auth", {
        body: { action: "login", username: username.trim(), password }
      });

      if (error || data?.error) {
        return { success: false, error: data?.error || error?.message || "Login failed" };
      }

      const session = {
        admin: data.admin,
        token: data.token,
        expiresAt: new Date(data.expiresAt).getTime()
      };

      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
      setAdmin(data.admin);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Login failed" };
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
