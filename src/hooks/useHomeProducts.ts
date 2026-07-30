import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/components/products/ProductCard";

const defaultImages = [
  "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1560472355-536de3962603?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop",
];

const fallbackProducts: Product[] = [
  {
    id: "fp-1",
    name: "Wireless Bluetooth Earbuds Pro with Active Noise Cancellation",
    slug: "wireless-bluetooth-earbuds-pro",
    image: defaultImages[0],
    price: 29.99,
    originalPrice: 59.99,
    rating: 4.8,
    reviews: 124,
    sold: 1420,
    freeShipping: true,
    isNew: true,
    isBestSeller: true,
  },
  {
    id: "fp-2",
    name: "Smart Watch Series 8 with Heart Rate Monitor GPS Fitness Tracker",
    slug: "smart-watch-series-8",
    image: defaultImages[1],
    price: 69.99,
    originalPrice: 119.99,
    rating: 4.9,
    reviews: 289,
    sold: 2150,
    freeShipping: true,
    isNew: false,
    isBestSeller: true,
  },
  {
    id: "fp-3",
    name: "Portable Power Bank 20000mAh Fast Charging USB-C",
    slug: "portable-power-bank-20000mah",
    image: defaultImages[2],
    price: 24.99,
    originalPrice: 39.99,
    rating: 4.7,
    reviews: 88,
    sold: 980,
    freeShipping: false,
    isNew: true,
    isBestSeller: false,
  },
  {
    id: "fp-4",
    name: "Mechanical Gaming Keyboard RGB Backlit with Hot-Swappable Switches",
    slug: "mechanical-gaming-keyboard-rgb",
    image: defaultImages[3],
    price: 49.99,
    originalPrice: 89.99,
    rating: 4.8,
    reviews: 156,
    sold: 840,
    freeShipping: true,
    isNew: false,
    isBestSeller: true,
  },
  {
    id: "fp-5",
    name: "Wireless Gaming Mouse 16000 DPI RGB Ergonomic Design",
    slug: "wireless-gaming-mouse-16000-dpi",
    image: defaultImages[4],
    price: 19.99,
    originalPrice: 34.99,
    rating: 4.6,
    reviews: 95,
    sold: 630,
    freeShipping: true,
    isNew: true,
    isBestSeller: false,
  },
  {
    id: "fp-6",
    name: "4K Ultra HD Webcam with Built-in Dual Microphones for Streaming",
    slug: "4k-ultra-hd-webcam-streaming",
    image: defaultImages[5],
    price: 39.99,
    originalPrice: 79.99,
    rating: 4.9,
    reviews: 210,
    sold: 1100,
    freeShipping: true,
    isNew: false,
    isBestSeller: true,
  },
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
  product_images?: { image_url: string; is_primary: boolean | null }[];
}

function mapProduct(p: ProductWithImages, index: number): Product {
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
    rating: Number(p.rating_average) || 4.7,
    reviews: p.rating_count || 15,
    sold: p.sold_count || 45,
    freeShipping: p.free_shipping ?? true,
    isNew: p.is_new_arrival ?? false,
    isBestSeller: p.is_best_seller ?? false,
  };
}

async function fetchAllHomeProducts() {
  try {
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
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data && data.length > 0) {
      const products = data as ProductWithImages[];
      const mapped = products.map((p, i) => mapProduct(p, i));

      const flashSale = products.filter((p) => p.is_flash_sale).map((p, i) => mapProduct(p, i));
      const featured = products.filter((p) => p.is_featured).map((p, i) => mapProduct(p, i));
      const newArrivals = products.filter((p) => p.is_new_arrival).map((p, i) => mapProduct(p, i));
      const trending = [...products].sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0)).map((p, i) => mapProduct(p, i));
      const recommended = [...products].sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0)).map((p, i) => mapProduct(p, i));

      return {
        latestProducts: mapped.slice(0, 12),
        flashSale: flashSale.length > 0 ? flashSale.slice(0, 6) : mapped.slice(0, 6),
        featured: featured.length > 0 ? featured.slice(0, 12) : mapped.slice(0, 12),
        newArrivals: newArrivals.length > 0 ? newArrivals.slice(0, 12) : mapped.slice(0, 12),
        trending: trending.length > 0 ? trending.slice(0, 6) : mapped.slice(0, 6),
        recommended: recommended.length > 0 ? recommended.slice(0, 12) : mapped.slice(0, 12),
      };
    }
  } catch (err) {
    console.warn("[useHomeProducts] Supabase fetch error, using fallback data:", err);
  }

  // Resilient fallback return
  return {
    latestProducts: fallbackProducts,
    flashSale: fallbackProducts,
    featured: fallbackProducts,
    newArrivals: fallbackProducts,
    trending: fallbackProducts,
    recommended: fallbackProducts,
  };
}

export function useHomeProducts() {
  return useQuery({
    queryKey: ["home-products"],
    queryFn: fetchAllHomeProducts,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
}
