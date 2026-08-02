import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/firebaseAdapter";

export interface SuggestProduct {
  id: string;
  name: string;
  slug: string;
  regular_price: number;
  discount_price: number | null;
  stock_quantity: number;
  rating_average: number;
  rating_count: number;
  image: string | null;
}

export interface SuggestCategory {
  id: string;
  name: string;
  slug: string;
}

export interface SuggestBrand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

export interface SuggestResult {
  products: SuggestProduct[];
  categories: SuggestCategory[];
  brands: SuggestBrand[];
}

/** Debounce any value */
export function useDebounced<T>(value: T, delay = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function escapeLike(s: string) {
  return s.replace(/[\\%_,()]/g, (m) => `\\${m}`);
}

async function fetchSuggestions(q: string): Promise<SuggestResult> {
  const term = q.trim();
  if (term.length < 2) return { products: [], categories: [], brands: [] };
  const tokens = term.split(/\s+/).filter((t) => t.length > 0);
  const tokenOrs = tokens
    .map((t) => {
      const esc = escapeLike(t);
      return `name.ilike.%${esc}%,short_description.ilike.%${esc}%,sku.ilike.%${esc}%`;
    })
    .join(",");

  const mainLike = `%${escapeLike(term)}%`;

  const [prodRes, catRes, brandRes] = await Promise.all([
    supabase
      .from("products")
      .select(
        `id, name, slug, regular_price, discount_price, stock_quantity, rating_average, rating_count, sold_count,
         product_images(image_url, is_primary, sort_order)`
      )
      .eq("status", "active")
      .or(tokenOrs || `name.ilike.${mainLike}`)
      .order("sold_count", { ascending: false, nullsFirst: false })
      .limit(10),
    supabase
      .from("categories")
      .select("id, name, slug")
      .ilike("name", mainLike)
      .limit(5),
    supabase
      .from("brands")
      .select("id, name, slug, logo_url")
      .eq("is_active", true)
      .ilike("name", mainLike)
      .limit(5),
  ]);

  const products: SuggestProduct[] = (prodRes.data || []).map((p: any) => {
    const imgs = (p.product_images || []) as { image_url: string; is_primary: boolean; sort_order: number }[];
    const primary = imgs.find((i) => i.is_primary) || imgs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))[0];
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      regular_price: Number(p.regular_price),
      discount_price: p.discount_price != null ? Number(p.discount_price) : null,
      stock_quantity: p.stock_quantity ?? 0,
      rating_average: Number(p.rating_average || 0),
      rating_count: p.rating_count ?? 0,
      image: primary?.image_url || null,
    };
  });

  // Rank: exact/prefix first
  const lower = term.toLowerCase();
  products.sort((a, b) => {
    const an = a.name.toLowerCase();
    const bn = b.name.toLowerCase();
    const ap = an === lower ? 0 : an.startsWith(lower) ? 1 : 2;
    const bp = bn === lower ? 0 : bn.startsWith(lower) ? 1 : 2;
    return ap - bp;
  });

  return {
    products,
    categories: (catRes.data || []) as SuggestCategory[],
    brands: (brandRes.data || []) as SuggestBrand[],
  };
}

export function useSearchSuggestions(rawQuery: string) {
  const query = useDebounced(rawQuery, 250);
  return useQuery({
    queryKey: ["search-suggest", query],
    queryFn: () => fetchSuggestions(query),
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  });
}

/* Recent searches (localStorage) */
const RECENT_KEY = "darzo:recent-searches";
const MAX_RECENT = 6;

export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function pushRecentSearch(term: string) {
  const t = term.trim();
  if (!t) return;
  try {
    const list = getRecentSearches().filter((x) => x.toLowerCase() !== t.toLowerCase());
    list.unshift(t);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch {
    /* ignore */
  }
}

export function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    /* ignore */
  }
}

export function removeRecentSearch(term: string) {
  try {
    const t = term.trim().toLowerCase();
    const list = getRecentSearches().filter((x) => x.toLowerCase() !== t);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

