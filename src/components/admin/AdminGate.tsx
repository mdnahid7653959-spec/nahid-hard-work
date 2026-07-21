import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import NotFound from "@/pages/NotFound";

export const ADMIN_GATE_KEY = "admin_gate_unlocked";
export const ADMIN_SECRET_PATH =
  "/nahid/dreem/e/comarce/467265@/apple789@/dreem/project/contole";

export function isAdminGateUnlocked(): boolean {
  try {
    return sessionStorage.getItem(ADMIN_GATE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Wrap any /admin/* route so it 404s unless the secret path was visited. */
export function AdminGate({ children }: { children: ReactNode }) {
  if (!isAdminGateUnlocked()) return <NotFound />;
  return <>{children}</>;
}

/** Route component mounted at the secret URL. Sets the flag and forwards to admin login. */
export function AdminSecretUnlock() {
  const location = useLocation();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      sessionStorage.setItem(ADMIN_GATE_KEY, "1");
    } catch {}
    setReady(true);
  }, []);
  if (!ready) return null;
  return <Navigate to="/admin/login" replace state={{ from: location }} />;
}
