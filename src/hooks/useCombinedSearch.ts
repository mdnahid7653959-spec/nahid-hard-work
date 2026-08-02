import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/firebaseAdapter";
import type { Product } from "@/components/products/ProductCard";
import { useCJSettings, calculateCJPrice } from "./useCJSettings";

interface SearchParams {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  filter?: string;
  includeCJ?: boolean;
}

interface CJProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category?: string;
}

// Combined product type with source indicator
export interface CombinedProduct extends Product {
  source: 'local' | 'cj';
  cjProductId?: string;
}

import { getCachedMohasagorProducts, filterProductsByCategory } from "@/utils/mohasagorCache";

async function searchLocalProducts(params: SearchParams): Promise<CombinedProduct[]> {
  // 1. Instant Memory & LocalStorage Cache Lookup (0ms delay)
  try {
    const mohasagorProds = await getCachedMohasagorProducts();
    if (mohasagorProds && mohasagorProds.length > 0) {
      let result = params.category ? filterProductsByCategory(mohasagorProds, params.category) : [...mohasagorProds];

      if (params.search) {
        const searchLower = params.search.toLowerCase().trim();
        const tokens = searchLower.split(/\s+/).filter((t) => t.length > 0);

        result = result.filter((p) => {
          const nameLower = (p.name || "").toLowerCase();
          const catLower = ((p as any).category || "").toLowerCase();
          return tokens.some((tok) => {
            const tokStem = tok.endsWith("s") ? tok.slice(0, -1) : tok;
            return (
              nameLower.includes(tok) ||
              nameLower.includes(tokStem) ||
              catLower.includes(tok) ||
              catLower.includes(tokStem)
            );
          });
        });

        // Rank by best match count
        result.sort((a, b) => {
          const aName = (a.name || "").toLowerCase();
          const bName = (b.name || "").toLowerCase();
          const aMatches = tokens.filter((t) => aName.includes(t)).length;
          const bMatches = tokens.filter((t) => bName.includes(t)).length;
          return bMatches - aMatches;
        });
      }

      if (params.filter) {
        if (params.filter === "flash-sale" || params.filter === "featured") {
          result = result.filter(p => p.isBestSeller || p.originalPrice);
        } else if (params.filter === "new") {
          result = result.filter(p => p.isNew);
        } else if (params.filter === "free-shipping") {
          result = result.filter(p => p.freeShipping);
        }
      }

      if (params.minPrice) {
        result = result.filter(p => p.price >= params.minPrice!);
      }
      if (params.maxPrice) {
        result = result.filter(p => p.price <= params.maxPrice!);
      }

      if (result.length > 0) {
        return result.map(p => ({ ...p, source: 'local' as const }));
      }
    }
  } catch (e) {
    console.warn("Cached products instant lookup error", e);
  }

  // 2. Fallback to Supabase DB query
  let query = supabase
    .from("products")
    .select(`
      id,
      name,
      slug,
      regular_price,
      discount_price,
      rating_average,
      rating_count,
      sold_count,
      free_shipping,
      is_new_arrival,
      is_best_seller,
      category:categories(id, name, slug),
      product_images (image_url, is_primary)
    `)
    .eq("status", "active");

  if (params.search) {
    const rawTerm = params.search.trim();
    const tokens = rawTerm.split(/\s+/).filter((t) => t.length > 0);
    const tokenOrs = tokens
      .map((t) => {
        const esc = t.replace(/[\\%_,()]/g, (m) => `\\${m}`);
        return `name.ilike.%${esc}%,short_description.ilike.%${esc}%,sku.ilike.%${esc}%`;
      })
      .join(",");
    if (tokenOrs) {
      query = query.or(tokenOrs);
    }
  }

  if (params.category) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", params.category)
      .maybeSingle();
    if (cat) {
      query = query.eq("category_id", cat.id);
    }
  }

  if (params.minPrice) {
    query = query.gte("regular_price", params.minPrice);
  }
  if (params.maxPrice) {
    query = query.lte("regular_price", params.maxPrice);
  }

  // Sorting
  switch (params.sort) {
    case "price-low":
      query = query.order("regular_price", { ascending: true });
      break;
    case "price-high":
      query = query.order("regular_price", { ascending: false });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    case "rating":
      query = query.order("rating_average", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query.limit(50);

  if (!error && data && data.length > 0) {
    const defaultImages = [
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop",
    ];

    return data.map((p: any): CombinedProduct => {
      const primaryImage = p.product_images?.find((img: any) => img.is_primary)?.image_url;
      const firstImage = p.product_images?.[0]?.image_url;

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        image: primaryImage || firstImage || defaultImages[0],
        price: p.discount_price || p.regular_price,
        originalPrice: p.discount_price ? p.regular_price : undefined,
        rating: Number(p.rating_average) || 0,
        reviews: p.rating_count || 0,
        sold: p.sold_count || 0,
        freeShipping: p.free_shipping || false,
        isNew: p.is_new_arrival || false,
        isBestSeller: p.is_best_seller || false,
        source: 'local',
      };
    });
  }

  // Fallback to Mohasagor API cached products if DB has 0 items!
  try {
    const mohasagorProds = await getCachedMohasagorProducts();
    let result = params.category ? filterProductsByCategory(mohasagorProds, params.category) : mohasagorProds;

    if (params.search) {
      const searchLower = params.search.toLowerCase().trim();
      const tokens = searchLower.split(/\s+/).filter((t) => t.length > 0);

      result = result.filter((p) => {
        const nameLower = (p.name || "").toLowerCase();
        const catLower = ((p as any).category || "").toLowerCase();
        return tokens.some((tok) => {
          const tokStem = tok.endsWith("s") ? tok.slice(0, -1) : tok;
          return (
            nameLower.includes(tok) ||
            nameLower.includes(tokStem) ||
            catLower.includes(tok) ||
            catLower.includes(tokStem)
          );
        });
      });

      result.sort((a, b) => {
        const aName = (a.name || "").toLowerCase();
        const bName = (b.name || "").toLowerCase();
        const aMatches = tokens.filter((t) => aName.includes(t)).length;
        const bMatches = tokens.filter((t) => bName.includes(t)).length;
        return bMatches - aMatches;
      });
    }

    if (params.filter) {
      if (params.filter === "flash-sale" || params.filter === "featured") {
        result = result.filter(p => p.isBestSeller || p.originalPrice);
      } else if (params.filter === "new") {
        result = result.filter(p => p.isNew);
      } else if (params.filter === "free-shipping") {
        result = result.filter(p => p.freeShipping);
      }
    }

    if (params.minPrice) {
      result = result.filter(p => p.price >= params.minPrice!);
    }
    if (params.maxPrice) {
      result = result.filter(p => p.price <= params.maxPrice!);
    }

    // Sorting
    if (params.sort === "price-low") {
      result.sort((a, b) => a.price - b.price);
    } else if (params.sort === "price-high") {
      result.sort((a, b) => b.price - a.price);
    } else if (params.sort === "rating") {
      result.sort((a, b) => b.rating - a.rating);
    }

    return result.map(p => ({
      ...p,
      source: 'local' as const,
    }));
  } catch (err) {
    console.error("Error in searchLocalProducts fallback:", err);
    return [];
  }
}

async function searchCJProducts(
  params: SearchParams,
  cjSettings: any
): Promise<CombinedProduct[]> {
  if (!cjSettings?.is_enabled || !cjSettings?.show_in_search) {
    return [];
  }

  try {
    const response = await supabase.functions.invoke("cj-products", {
      body: { 
        keyword: params.search || "",
        page: 1,
        size: 20,
      },
    });

    if (response.error) {
      console.error("CJ search error:", response.error);
      return [];
    }

    const products = response.data?.products || [];

    return products.map((p: CJProduct): CombinedProduct => ({
      id: `cj-${p.id}`,
      name: p.name,
      slug: `cj/${p.id}`,
      image: p.image || "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop",
      price: calculateCJPrice(p.price, cjSettings),
      originalPrice: p.originalPrice ? calculateCJPrice(p.originalPrice, cjSettings) : undefined,
      rating: 4.5,
      reviews: 100,
      sold: 500,
      freeShipping: true,
      isNew: false,
      isBestSeller: false,
      source: 'cj',
      cjProductId: p.id,
    }));
  } catch (error) {
    console.error("CJ search error:", error);
    return [];
  }
}

export function useCombinedSearch(params: SearchParams) {
  const { data: cjSettings } = useCJSettings();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["combined-search"] });
    };

    if (typeof window !== "undefined") {
      window.addEventListener("mohasagor_products_updated", handleUpdate);
      return () => window.removeEventListener("mohasagor_products_updated", handleUpdate);
    }
  }, [queryClient]);

  return useQuery({
    queryKey: ["combined-search", params, cjSettings?.is_enabled],
    queryFn: async () => {
      try {
        const includeCJ = params.includeCJ !== false && cjSettings?.is_enabled && cjSettings?.show_in_search;
        
        // Fetch local and CJ products in parallel
        const [localProducts, cjProducts] = await Promise.all([
          searchLocalProducts(params),
          includeCJ && params.search ? searchCJProducts(params, cjSettings) : Promise.resolve([]),
        ]);

        return {
          local: localProducts || [],
          cj: cjProducts || [],
          combined: [...(localProducts || []), ...(cjProducts || [])],
        };
      } catch (err) {
        console.error("Error in useCombinedSearch queryFn:", err);
        return { local: [], cj: [], combined: [] };
      }
    },
    staleTime: 30 * 1000,
    enabled: true,
  });
}
