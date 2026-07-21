// Client helper for the admin-db edge function.
// Provides a thin, ergonomic wrapper so admin pages don't have to hand-roll
// invoke() calls or manage adminId lookup.

import { supabase } from "@/integrations/supabase/client";

const ADMIN_SESSION_KEY = "megamart_admin_session";

function getAdminSession(): { id: string | null; token: string | null } {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return { id: null, token: null };
    const s = JSON.parse(raw);
    return { id: s?.admin?.id ?? null, token: s?.token ?? null };
  } catch {
    return { id: null, token: null };
  }
}

function getAdminId(): string | null {
  return getAdminSession().id;
}

type Filter = { col: string; op?: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "is" | "ilike" | "like" | "contains"; value: any };

async function invoke(body: Record<string, any>) {
  const { id: adminId, token } = getAdminSession();
  if (!adminId) return { data: null, error: new Error("Not authenticated as admin") };
  const { data, error } = await supabase.functions.invoke("admin-db", {
    body: { ...body, adminId },
    headers: token ? { "x-admin-token": token } : undefined,
  });
  if (error) return { data: null, error };
  if (data?.error) return { data: null, error: new Error(data.error) };
  return { data, error: null };
}

export const adminDb = {
  async select<T = any>(table: string, opts?: {
    columns?: string;
    filters?: Filter[];
    orderBy?: { col: string; ascending?: boolean };
    limit?: number;
    count?: boolean;
  }) {
    const { data, error } = await invoke({ op: "select", table, ...opts });
    return { data: (data?.data as T[] | null) ?? null, count: data?.count ?? null, error };
  },

  async insert<T = any>(table: string, values: Record<string, any> | Record<string, any>[]) {
    const { data, error } = await invoke({ op: "insert", table, values });
    return { data: (data?.data as T[] | null) ?? null, error };
  },

  async upsert<T = any>(table: string, values: Record<string, any> | Record<string, any>[]) {
    const { data, error } = await invoke({ op: "upsert", table, values });
    return { data: (data?.data as T[] | null) ?? null, error };
  },

  async update<T = any>(table: string, values: Record<string, any>, where: { id?: any; idColumn?: string; filters?: Filter[] }) {
    const { data, error } = await invoke({ op: "update", table, values, ...where });
    return { data: (data?.data as T[] | null) ?? null, error };
  },

  async remove(table: string, where: { id?: any; idColumn?: string; filters?: Filter[] }) {
    const { data, error } = await invoke({ op: "delete", table, ...where });
    return { data, error };
  },
};
