import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const cacheKey = (key: string) => `site-config:${key}`;

function readCache<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(cacheKey(key));
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function writeCache<T>(key: string, value: T) {
  try {
    localStorage.setItem(cacheKey(key), JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function useSiteConfig<T = Record<string, unknown>>(key: string, fallback: T): { config: T; isLoading: boolean } {
  const cached = readCache<T>(key);

  const { data, isLoading } = useQuery({
    queryKey: ["site-config", key],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("site_config")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      const value = (data?.value ?? null) as T | null;
      if (value !== null) writeCache(key, value);
      return value;
    },
    staleTime: 5 * 60 * 1000,
    initialData: cached ?? undefined,
  });

  return { config: (data as T) ?? cached ?? fallback, isLoading: isLoading && !cached };
}
