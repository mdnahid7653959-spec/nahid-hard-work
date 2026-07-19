import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/components/products/ProductCard";

const defaultImages = [
  "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1560472355-536de3962603?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
];

interface ProductWithImages {
  id: string;
  name: string;
  slug: string;
  regular_price: number;
  discount_price: number | null;
  rating_average: number | null;
  rating_count: number | null;
  sold_count: number | null;
  free_shipping: boolean | null;
  is_new_arrival: boolean | null;
  is_best_seller: boolean | null;
  product_images: { image_url: string; is_primary: boolean | null }[];
  category?: { id: string; name: string; slug: string } | null;
}

function mapProduct(p: ProductWithImages, index: number): Product {
  // Use actual product image if available
  const primaryImage = p.product_images?.find((img) => img.is_primary)?.image_url;
  const firstImage = p.product_images?.[0]?.image_url;
  const image = primaryImage || firstImage || defaultImages[index % defaultImages.length];

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    image,
    price: p.discount_price || p.regular_price,
    originalPrice: p.discount_price ? p.regular_price : undefined,
    rating: Number(p.rating_average) || 0,
    reviews: p.rating_count || 0,
    sold: p.sold_count || 0,
    freeShipping: p.free_shipping || false,
    isNew: p.is_new_arrival || false,
    isBestSeller: p.is_best_seller || false,
  };
}

interface SearchParams {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  filter?: string;
}

async function searchProducts(params: SearchParams) {
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
      is_featured,
      is_flash_sale,
      category:categories(id, name, slug),
      product_images (
        image_url,
        is_primary
      )
    `)
    .eq("status", "active");

  // Search by name or description
  if (params.search) {
    const searchTerm = `%${params.search}%`;
    query = query.or(`name.ilike.${searchTerm},description.ilike.${searchTerm},short_description.ilike.${searchTerm}`);
  }

  // Filter by category
  if (params.category) {
    const { data: categoryData } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", params.category)
      .single();

    if (categoryData) {
      query = query.eq("category_id", categoryData.id);
    }
  }

  // Price filters
  if (params.minPrice !== undefined) {
    query = query.gte("regular_price", params.minPrice);
  }
  if (params.maxPrice !== undefined) {
    query = query.lte("regular_price", params.maxPrice);
  }

  // Special filters
  if (params.filter === "featured") {
    query = query.eq("is_featured", true);
  } else if (params.filter === "new") {
    query = query.eq("is_new_arrival", true);
  } else if (params.filter === "flash-sale") {
    query = query.eq("is_flash_sale", true);
  } else if (params.filter === "free-shipping") {
    query = query.eq("free_shipping", true);
  }

  // Sorting
  switch (params.sort) {
    case "price-low":
      query = query.order("regular_price", { ascending: true });
      break;
    case "price-high":
      query = query.order("regular_price", { ascending: false });
      break;
    case "trending":
      query = query.order("sold_count", { ascending: false, nullsFirst: false });
      break;
    case "rating":
      query = query.order("rating_average", { ascending: false, nullsFirst: false });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  query = query.limit(100);

  const { data, error } = await query;

  if (error) throw error;

  return ((data || []) as ProductWithImages[]).map((p, i) => mapProduct(p, i));
}

export function useProductSearch(params: SearchParams) {
  return useQuery({
    queryKey: ["product-search", params],
    queryFn: () => searchProducts(params),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// Hook to get categories for filters
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
