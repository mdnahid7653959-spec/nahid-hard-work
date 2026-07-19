import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { ProductCard, type Product } from "@/components/products/ProductCard";
import { CombinedProductCard } from "@/components/products/CombinedProductCard";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Globe, Loader2 } from "lucide-react";
import { useCJSettings, calculateCJPrice, mapCJCategory, useCJCategoryMappings } from "@/hooks/useCJSettings";
import type { CombinedProduct } from "@/hooks/useCombinedSearch";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export default function CategoryPage() {
  const { slug } = useParams();
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cjProducts, setCJProducts] = useState<CombinedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  const { data: cjSettings } = useCJSettings();
  const { data: cjMappings } = useCJCategoryMappings();

  useEffect(() => {
    async function fetchData() {
      if (!slug) return;

      // Fetch all categories for mapping
      const { data: allCats } = await supabase
        .from("categories")
        .select("id, name, slug, description")
        .eq("is_active", true);

      if (allCats) {
        setCategories(allCats);
      }

      // Fetch current category
      const { data: catData } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", slug)
        .single();

      if (catData) {
        setCategory(catData);

        // Fetch local products by category_id with images
        const { data: prodData } = await supabase
          .from("products")
          .select(`
            *,
            category:categories(id, name, slug),
            product_images(image_url, is_primary)
          `)
          .eq("category_id", catData.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(50);

        if (prodData) {
          const mappedProducts: Product[] = prodData.map(p => {
            const primaryImage = p.product_images?.find((img: any) => img.is_primary)?.image_url;
            const firstImage = p.product_images?.[0]?.image_url;
            const fallbackImage = "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop";
            
            return {
              id: p.id,
              name: p.name,
              slug: p.slug,
              image: primaryImage || firstImage || fallbackImage,
              price: p.discount_price || p.regular_price,
              originalPrice: p.discount_price ? p.regular_price : undefined,
              rating: Number(p.rating_average) || 0,
              reviews: p.rating_count || 0,
              sold: p.sold_count || 0,
              freeShipping: p.free_shipping || false,
              isNew: p.is_new_arrival || false,
              isBestSeller: p.is_best_seller || false,
            };
          });
          setProducts(mappedProducts);
        }

        // Fetch CJ products if enabled
        if (cjSettings?.is_enabled && cjSettings?.show_in_categories && allCats) {
          await fetchCJProductsForCategory(catData, allCats);
        }
      }

      setLoading(false);
    }

    fetchData();
  }, [slug, cjSettings?.is_enabled, cjSettings?.show_in_categories]);

  async function fetchCJProductsForCategory(cat: Category, allCats: Category[]) {
    try {
      const response = await supabase.functions.invoke("cj-products", {
        body: { page: 1, size: 20 },
      });

      if (response.error || !response.data?.products) return;

      const cjProds = response.data.products;
      
      // Filter CJ products that match this category
      const matchedProducts: CombinedProduct[] = [];

      for (const p of cjProds) {
        const cjCategoryName = p.category || p.categoryName || "";
        const mappedCat = mapCJCategory(cjCategoryName, cjMappings || [], allCats);
        
        // Check if this CJ product maps to the current category
        if (mappedCat && mappedCat.slug === cat.slug) {
          matchedProducts.push({
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
          });
        }
      }

      setCJProducts(matchedProducts);
    } catch (error) {
      console.error("Error fetching CJ products for category:", error);
    }
  }

  const totalCount = products.length + cjProducts.length;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center pb-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="px-3 sm:container py-4 sm:py-8">
          {/* Breadcrumb - Hidden on mobile */}
          <nav className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link to="/" className="hover:text-primary">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{category?.name || "Category"}</span>
          </nav>

          {/* Category Header - Compact on mobile */}
          <div className="mb-4 sm:mb-8">
            <h1 className="text-xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">
              {category?.name || "Products"}
            </h1>
            {category?.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{category.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {totalCount} Products
              </Badge>
              {cjProducts.length > 0 && (
                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                  <Globe className="h-3 w-3" />
                  {cjProducts.length} International
                </Badge>
              )}
            </div>
          </div>

          {totalCount > 0 ? (
            <>
              {/* Local Products */}
              {products.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                  {products.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}

              {/* CJ Products Section */}
              {cjProducts.length > 0 && (
                <>
                  {products.length > 0 && (
                    <div className="flex items-center gap-3 my-6 sm:my-8">
                      <div className="h-px flex-1 bg-border" />
                      <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1 text-xs">
                        <Globe className="h-3.5 w-3.5" />
                        International
                      </Badge>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                    {cjProducts.map(product => (
                      <CombinedProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="text-center py-12 sm:py-16">
              <p className="text-muted-foreground text-sm sm:text-base">No products found in this category.</p>
              <Link to="/categories" className="text-primary text-sm mt-2 inline-block">
                Browse all categories
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
