import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSiteConfig<T = Record<string, unknown>>(key: string, fallback: T): { config: T; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["site-config", key],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("site_config")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      return data?.value as T | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  return { config: (data as T) ?? fallback, isLoading };
}
