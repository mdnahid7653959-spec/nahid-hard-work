import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

async function searchLocalProducts(params: SearchParams): Promise<CombinedProduct[]> {
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
    query = query.ilike("name", `%${params.search}%`);
  }

  if (params.category) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", params.category)
      .single();
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

  if (error) {
    console.error("Error searching local products:", error);
    return [];
  }

  const defaultImages = [
    "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop",
  ];

  return (data || []).map((p: any, i: number): CombinedProduct => {
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

  return useQuery({
    queryKey: ["combined-search", params, cjSettings?.is_enabled],
    queryFn: async () => {
      const includeCJ = params.includeCJ !== false && cjSettings?.is_enabled && cjSettings?.show_in_search;
      
      // Fetch local and CJ products in parallel
      const [localProducts, cjProducts] = await Promise.all([
        searchLocalProducts(params),
        includeCJ && params.search ? searchCJProducts(params, cjSettings) : Promise.resolve([]),
      ]);

      // Combine and return
      return {
        local: localProducts,
        cj: cjProducts,
        combined: [...localProducts, ...cjProducts],
      };
    },
    staleTime: 2 * 60 * 1000,
    enabled: true,
  });
}
