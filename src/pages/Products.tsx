import { useState } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/products/ProductCard";
import { CombinedProductCard } from "@/components/products/CombinedProductCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter, ChevronRight, Globe } from "lucide-react";
import { useCombinedSearch } from "@/hooks/useCombinedSearch";
import { useCategories } from "@/hooks/useProductSearch";
import { useCJSettings } from "@/hooks/useCJSettings";
import { SEOHead } from "@/components/SEOHead";

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [showFilters, setShowFilters] = useState(false);

  const pathFilter = location.pathname.includes("flash-sale") ? "flash-sale"
    : location.pathname.includes("new-arrivals") ? "new"
    : location.pathname.includes("free-shipping") ? "free-shipping"
    : undefined;

  const params = {
    search: searchParams.get("search") || undefined,
    category: searchParams.get("category") || undefined,
    sort: searchParams.get("sort") || undefined,
    filter: searchParams.get("filter") || pathFilter || undefined,
  };

  const { data: searchResults, isLoading } = useCombinedSearch(params);
  const { data: categories } = useCategories();
  const { data: cjSettings } = useCJSettings();

  const updateFilter = (key: string, value: string | null) => {
    if (value) {
      searchParams.set(key, value);
    } else {
      searchParams.delete(key);
    }
    setSearchParams(searchParams);
  };

  const clearFilters = () => {
    setSearchParams({});
  };

  const hasFilters = searchParams.toString().length > 0;
  const localProducts = searchResults?.local || [];
  const cjProducts = searchResults?.cj || [];
  const totalCount = localProducts.length + cjProducts.length;

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-hidden">
      <SEOHead 
        title={params.search ? `Search: ${params.search} - MegaMart` : "All Products - MegaMart"}
        description="Browse our wide selection of products at the best prices."
      />
      <Header />
      <main className="flex-1 max-w-full overflow-hidden">
        <div className="container py-4 sm:py-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar Filters */}
            <aside className={`lg:w-64 shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
              <div className="bg-card border rounded-xl p-4 sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Filters</h3>
                  {hasFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Clear all
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Category</label>
                    <Select value={params.category || "all"} onValueChange={(v) => updateFilter("category", v === "all" ? null : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Sort By</label>
                    <Select value={params.sort || "newest"} onValueChange={(v) => updateFilter("sort", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="price-low">Price: Low to High</SelectItem>
                        <SelectItem value="price-high">Price: High to Low</SelectItem>
                        <SelectItem value="trending">Most Popular</SelectItem>
                        <SelectItem value="rating">Top Rated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Filter</label>
                    <Select value={params.filter || "all"} onValueChange={(v) => updateFilter("filter", v === "all" ? null : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Products" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="all">All Products</SelectItem>
                        <SelectItem value="featured">Featured</SelectItem>
                        <SelectItem value="new">New Arrivals</SelectItem>
                        <SelectItem value="flash-sale">Flash Sale</SelectItem>
                        <SelectItem value="free-shipping">Free Shipping</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* CJ Products Info */}
                  {cjSettings?.is_enabled && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Globe className="h-4 w-4" />
                        <span>International products included</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground min-w-0 truncate">
                  {params.search ? `Results for "${params.search}"` : "All Products"}
                </h1>
                
                <Button variant="outline" className="lg:hidden" onClick={() => setShowFilters(!showFilters)}>
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-square bg-muted rounded-xl mb-3" />
                      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : totalCount > 0 ? (
                <>
                  {cjProducts.length > 0 && (
                    <div className="flex items-center gap-4 mb-4">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {cjProducts.length} International
                      </Badge>
                    </div>
                  )}

                  {/* Local Products Section */}
                  {localProducts.length > 0 && (
                    <div className="space-y-8 mb-8">
                      {/* SECTION 1: 1. BEST MATCHED PRODUCT */}
                      {params.search && localProducts[0] && (
                        <div className="bg-card border-2 border-primary/40 rounded-3xl p-5 shadow-lg relative overflow-hidden">
                          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/60">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-primary text-primary-foreground px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-xl">
                                1. BEST MATCHED PRODUCT
                              </Badge>
                              <span className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider">
                                95% Match Confidence
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-center gap-5">
                            <div className="relative h-32 w-32 rounded-2xl overflow-hidden border shrink-0 bg-muted shadow-sm group">
                              <img
                                src={localProducts[0].image}
                                alt={localProducts[0].name}
                                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                              />
                              {localProducts[0].originalPrice && (
                                <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-md">
                                  SAVE
                                </span>
                              )}
                            </div>

                            <div className="flex-1 min-w-0 text-center sm:text-left">
                              <h3 className="text-lg font-extrabold text-foreground truncate">
                                {localProducts[0].name}
                              </h3>

                              <div className="flex items-center justify-center sm:justify-start gap-3 mt-2">
                                <span className="text-xl font-black text-primary">
                                  ৳{localProducts[0].price.toLocaleString("en-BD")}
                                </span>
                                {localProducts[0].originalPrice && (
                                  <span className="text-xs text-muted-foreground line-through">
                                    ৳{localProducts[0].originalPrice.toLocaleString("en-BD")}
                                  </span>
                                )}
                                <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                                  In Stock
                                </span>
                              </div>

                              <Link
                                to={`/product/${localProducts[0].slug}`}
                                className="inline-flex items-center justify-center mt-4 h-11 px-7 text-xs font-extrabold uppercase tracking-wider rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all active:scale-[0.98]"
                              >
                                View Product Details →
                              </Link>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SECTION 2: 2. RELATED PRODUCTS & SIMILAR STYLES */}
                      <div className="space-y-4">
                        {params.search && localProducts.length > 1 && (
                          <div className="flex items-center justify-between px-1">
                            <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-primary inline-block" />
                              2. RELATED PRODUCTS & SIMILAR STYLES
                            </h4>
                            <span className="text-[11px] font-semibold text-muted-foreground">
                              {localProducts.length - 1} items
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {(params.search && localProducts.length > 1 ? localProducts.slice(1) : localProducts).map(product => (
                            <ProductCard key={product.id} product={product} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CJ Products Section */}
                  {cjProducts.length > 0 && (
                    <>
                      {localProducts.length > 0 && (
                        <div className="flex items-center gap-3 my-6">
                          <div className="h-px flex-1 bg-border" />
                          <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1">
                            <Globe className="h-3.5 w-3.5" />
                            International Products
                          </Badge>
                          <div className="h-px flex-1 bg-border" />
                        </div>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {cjProducts.map(product => (
                          <CombinedProductCard key={product.id} product={product} />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center py-16">
                  <p className="text-muted-foreground mb-4">No products found.</p>
                  <Button onClick={clearFilters}>Clear Filters</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
