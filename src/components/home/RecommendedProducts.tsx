import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type Product } from "@/components/products/ProductCard";
import { ChevronRight, ThumbsUp } from "lucide-react";

export function RecommendedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .order("rating_average", { ascending: false })
        .limit(12);

      if (error) {
        console.error("Error fetching products:", error);
      } else if (data) {
        const defaultImages = [
          "https://images.unsplash.com/photo-1491553895911-0055uj6402d5?w=400&h=400&fit=crop",
          "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=400&fit=crop",
          "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400&h=400&fit=crop",
          "https://images.unsplash.com/photo-1560472355-536de3962603?w=400&h=400&fit=crop",
          "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=400&fit=crop",
          "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=400&h=400&fit=crop",
        ];

        const mappedProducts: Product[] = data.map((p, i) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          image: defaultImages[i % defaultImages.length],
          price: p.discount_price || p.regular_price,
          originalPrice: p.discount_price ? p.regular_price : undefined,
          rating: Number(p.rating_average) || 4.8,
          reviews: p.rating_count || 200,
          sold: p.sold_count || 1000,
          freeShipping: p.free_shipping || true,
        }));
        setProducts(mappedProducts);
      }
      setLoading(false);
    }
    fetchProducts();
  }, []);

  if (loading || products.length === 0) return null;

  return (
    <section className="py-6">
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="p-4 sm:p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <ThumbsUp className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Recommended For You</h2>
              <p className="text-sm text-muted-foreground">Based on your interests</p>
            </div>
          </div>
          <Link to="/products" className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium">
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
