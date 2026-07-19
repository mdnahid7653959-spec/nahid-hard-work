import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviews: number;
  sold: number;
  freeShipping: boolean;
  isBestSeller: boolean;
  isNew?: boolean;
  matchScore?: number;
}

interface ProductContext {
  id: string;
  name: string;
  category_id?: string | null;
  brand_id?: string | null;
  regular_price: number;
  discount_price?: number | null;
  tags?: string[] | null;
}

const DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=400&h=400&fit=crop",
];

export function useRelatedProducts(productContext: ProductContext | null, limit: number = 12) {
  const [products, setProducts] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRelatedProducts = useCallback(async () => {
    if (!productContext?.id) return;

    setLoading(true);
    setError(null);

    try {
      const currentPrice = productContext.discount_price || productContext.regular_price;
      const priceMin = currentPrice * 0.5; // 50% lower
      const priceMax = currentPrice * 2; // 200% higher

      // Build smart query with scoring logic
      // Priority: Same category > Same brand > Similar price > Popular items
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
          is_best_seller,
          is_new_arrival,
          category_id,
          brand_id,
          tags,
          product_images (
            image_url,
            is_primary,
            sort_order
          )
        `)
        .eq("status", "active")
        .neq("id", productContext.id) // Exclude current product
        .limit(limit * 3); // Fetch more for scoring

      // If product has category or brand, prioritize matches
      if (productContext.category_id && productContext.brand_id) {
        query = query.or(`category_id.eq.${productContext.category_id},brand_id.eq.${productContext.brand_id}`);
      } else if (productContext.category_id) {
        query = query.eq("category_id", productContext.category_id);
      } else if (productContext.brand_id) {
        query = query.eq("brand_id", productContext.brand_id);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      if (!data || data.length === 0) {
        // Fallback: Get popular products if no matches found
        const { data: fallbackData } = await supabase
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
            is_best_seller,
            is_new_arrival,
            category_id,
            brand_id,
            tags,
            product_images (
              image_url,
              is_primary,
              sort_order
            )
          `)
          .eq("status", "active")
          .neq("id", productContext.id)
          .order("sold_count", { ascending: false })
          .limit(limit);

        if (fallbackData) {
          setProducts(mapToRelatedProducts(fallbackData, productContext));
        }
        setLoading(false);
        return;
      }

      // Score and sort products by relevance
      const scoredProducts = data.map((p: any) => {
        let score = 0;

        // Category match (highest priority) - 40 points
        if (p.category_id && p.category_id === productContext.category_id) {
          score += 40;
        }

        // Brand match - 25 points
        if (p.brand_id && p.brand_id === productContext.brand_id) {
          score += 25;
        }

        // Price range match (within 50% range) - 15 points
        const itemPrice = p.discount_price || p.regular_price;
        if (itemPrice >= priceMin && itemPrice <= priceMax) {
          score += 15;
        }

        // Keyword/tag overlap - 10 points per match
        if (productContext.tags && p.tags) {
          const overlap = productContext.tags.filter((tag: string) => 
            p.tags.includes(tag)
          ).length;
          score += overlap * 10;
        }

        // Name similarity (basic word matching) - 5 points per word
        const currentWords = productContext.name.toLowerCase().split(/\s+/);
        const productWords = p.name.toLowerCase().split(/\s+/);
        const wordOverlap = currentWords.filter((word: string) => 
          word.length > 2 && productWords.some((pw: string) => pw.includes(word) || word.includes(pw))
        ).length;
        score += wordOverlap * 5;

        // Popularity boost - up to 10 points
        const popularityScore = Math.min((p.sold_count || 0) / 100, 10);
        score += popularityScore;

        // Rating boost - up to 5 points
        const ratingScore = ((p.rating_average || 0) / 5) * 5;
        score += ratingScore;

        // Best seller badge - 5 points
        if (p.is_best_seller) {
          score += 5;
        }

        return { ...p, matchScore: score };
      });

      // Sort by score descending, then by sold_count
      scoredProducts.sort((a, b) => {
        if (b.matchScore !== a.matchScore) {
          return b.matchScore - a.matchScore;
        }
        return (b.sold_count || 0) - (a.sold_count || 0);
      });

      // Take top results
      const topProducts = scoredProducts.slice(0, limit);
      setProducts(mapToRelatedProducts(topProducts, productContext));

    } catch (err: any) {
      console.error("Error fetching related products:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [productContext?.id, productContext?.category_id, productContext?.brand_id, limit]);

  useEffect(() => {
    fetchRelatedProducts();
  }, [fetchRelatedProducts]);

  return { products, loading, error, refetch: fetchRelatedProducts };
}

function mapToRelatedProducts(data: any[], context: ProductContext): RelatedProduct[] {
  return data.map((p, i) => {
    // Get primary image or first image
    let image = DEFAULT_IMAGES[i % DEFAULT_IMAGES.length];
    if (p.product_images && p.product_images.length > 0) {
      const primaryImage = p.product_images.find((img: any) => img.is_primary);
      const sortedImages = [...p.product_images].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      image = primaryImage?.image_url || sortedImages[0]?.image_url || image;
    }

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
      isBestSeller: p.is_best_seller || false,
      isNew: p.is_new_arrival || false,
      matchScore: p.matchScore,
    };
  });
}
