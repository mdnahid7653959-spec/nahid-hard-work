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
  is_featured: boolean | null;
  is_flash_sale: boolean | null;
  product_images: { image_url: string; is_primary: boolean | null }[];
}

function mapProduct(p: ProductWithImages, index: number): Product {
  // Use actual product image if available, otherwise fallback
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

async function fetchAllHomeProducts() {
  // Query products with their images
  const { data, error } = await supabase
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
      product_images (
        image_url,
        is_primary
      )
    `)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  const products = (data || []) as ProductWithImages[];

  // Latest products - already sorted by created_at desc from query
  const latestProducts = products
    .slice(0, 12)
    .map((p, i) => mapProduct(p, i));

  // Categorize products for different sections
  const flashSale = products
    .filter((p) => p.is_flash_sale)
    .slice(0, 6)
    .map((p, i) => mapProduct(p, i));

  const featured = products
    .filter((p) => p.is_featured)
    .slice(0, 12)
    .map((p, i) => mapProduct(p, i));

  const newArrivals = products
    .filter((p) => p.is_new_arrival)
    .slice(0, 12)
    .map((p, i) => mapProduct(p, i));

  const trending = [...products]
    .sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0))
    .slice(0, 6)
    .map((p, i) => mapProduct(p, i));

  const recommended = [...products]
    .sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0))
    .slice(0, 12)
    .map((p, i) => mapProduct(p, i));

  return {
    latestProducts,
    flashSale,
    featured,
    newArrivals,
    trending,
    recommended,
  };
}

export function useHomeProducts() {
  return useQuery({
    queryKey: ["home-products"],
    queryFn: fetchAllHomeProducts,
    staleTime: 5 * 60 * 1000, // 5 minutes - products don't change frequently
    gcTime: 15 * 60 * 1000, // 15 minutes cache
    refetchOnWindowFocus: false, // Don't refetch on tab focus
    refetchOnMount: false, // Use cached data when navigating back
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}
