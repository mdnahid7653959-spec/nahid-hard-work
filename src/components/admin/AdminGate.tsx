import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import NotFound from "@/pages/NotFound";

export const ADMIN_GATE_KEY = "admin_gate_unlocked";
export const ADMIN_SECRET_PREFIX =
  "/nahid/dreem/e/comarce/467265@/apple789@/dreem/project";
export const ADMIN_SECRET_SLUG = "contole";
export const ADMIN_SECRET_PATH = `${ADMIN_SECRET_PREFIX}/${ADMIN_SECRET_SLUG}`;
export const ADMIN_SECRET_ROUTE = `${ADMIN_SECRET_PREFIX}/:unlockCode/*`;

function normalizeAdminPath(pathname: string): string {
  let decoded = pathname;
  try {
    decoded = decodeURI(pathname);
  } catch {
    decoded = pathname;
  }

  return decoded
    .replace(/\/+$/g, "")
    .replace(/[\s\u2013\u2014-]+$/u, "");
}

function isSecretAdminPath(pathname: string): boolean {
  return normalizeAdminPath(pathname) === ADMIN_SECRET_PATH;
}

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
    if (!isSecretAdminPath(location.pathname)) {
      setReady(true);
      return;
    }

    try {
      sessionStorage.setItem(ADMIN_GATE_KEY, "1");
    } catch {}
    setReady(true);
  }, [location.pathname]);

  if (!ready) return null;
  if (!isSecretAdminPath(location.pathname)) return <NotFound />;
  return <Navigate to="/admin/login" replace state={{ from: location }} />;
}
