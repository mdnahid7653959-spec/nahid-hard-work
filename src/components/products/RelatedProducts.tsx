import { memo, useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard, type Product } from "./ProductCard";
import { useRelatedProducts } from "@/hooks/useRelatedProducts";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
interface ProductContext {
  id: string;
  name: string;
  category_id?: string | null;
  brand_id?: string | null;
  regular_price: number;
  discount_price?: number | null;
  tags?: string[] | null;
}
interface RelatedProductsProps {
  product: ProductContext | null;
  title?: string;
  subtitle?: string;
  limit?: number;
}
function RelatedProductsComponent({
  product,
  title = "You May Also Like",
  subtitle = "Similar products you might be interested in",
  limit = 12
}: RelatedProductsProps) {
  const {
    products,
    loading,
    error
  } = useRelatedProducts(product, limit);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Check scroll position
  const checkScrollPosition = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const {
      scrollLeft,
      scrollWidth,
      clientWidth
    } = container;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    checkScrollPosition();
    container.addEventListener("scroll", checkScrollPosition);
    window.addEventListener("resize", checkScrollPosition);
    return () => {
      container.removeEventListener("scroll", checkScrollPosition);
      window.removeEventListener("resize", checkScrollPosition);
    };
  }, [products]);

  // Scroll handlers - 3 cards at a time on desktop
  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const cardWidth = container.querySelector("div")?.offsetWidth || 200;
    const scrollAmount = cardWidth * 3;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth"
    });
  };

  // Convert to ProductCard format
  const mappedProducts: Product[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    image: p.image,
    price: p.price,
    originalPrice: p.originalPrice,
    rating: p.rating,
    reviews: p.reviews,
    sold: p.sold,
    freeShipping: p.freeShipping,
    isBestSeller: p.isBestSeller,
    isNew: p.isNew
  }));

  // Don't render if no products and not loading
  if (!loading && products.length === 0) return null;
  return <section className="py-8 sm:py-10 lg:py-14 w-full overflow-hidden">
      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
        {/* Header */}
        <div className="p-4 sm:p-6 lg:px-8 lg:py-7 border-b flex items-center justify-between">
          <div className="flex items-center gap-3 lg:gap-4">
            

          
            <div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">{title}</h2>
              <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">{subtitle}</p>
            </div>
          </div>

          {/* Desktop Navigation Arrows */}
          <div className="hidden sm:flex items-center gap-2">
            <Button variant="outline" size="icon" className={cn("h-9 w-9 lg:h-10 lg:w-10 rounded-full transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary", !canScrollLeft && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-foreground hover:border-border")} onClick={() => scroll("left")} disabled={!canScrollLeft}>
              <ChevronLeft className="h-4 w-4 lg:h-5 lg:w-5" />
            </Button>
            <Button variant="outline" size="icon" className={cn("h-9 w-9 lg:h-10 lg:w-10 rounded-full transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary", !canScrollRight && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-foreground hover:border-border")} onClick={() => scroll("right")} disabled={!canScrollRight}>
              <ChevronRight className="h-4 w-4 lg:h-5 lg:w-5" />
            </Button>
          </div>
        </div>

        {/* Products Carousel */}
        <div className="relative p-4 sm:p-6 lg:p-8 overflow-hidden">
           {loading ? <div className="flex gap-3 sm:gap-4 lg:gap-5 overflow-hidden">
          {Array.from({
            length: 6
          }).map((_, i) => <div key={i} className="flex-shrink-0 w-[140px] sm:w-[180px] lg:w-[calc((100%-5*1.25rem)/6)]">
                  <Skeleton className="aspect-square rounded-xl mb-3" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-5 w-1/3" />
                </div>)}
            </div> : <>
              {/* Scroll shadow indicators */}
              {canScrollLeft && <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-r from-card to-transparent z-10 pointer-events-none" />}
              {canScrollRight && <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none" />}

              <div ref={scrollContainerRef} className="flex gap-3 sm:gap-4 lg:gap-5 overflow-x-auto scroll-smooth touch-pan-x" style={{
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none"
          }}>
                {mappedProducts.map((product) => <div key={product.id} className="flex-shrink-0 w-[140px] sm:w-[180px] lg:w-[calc((100%-5*1.25rem)/6)]">
                    <ProductCard product={product} />
                  </div>)}
              </div>
            </>}
        </div>

        {/* Mobile scroll hint */}
        <div className="sm:hidden flex justify-center pb-4">
          <div className="flex gap-1.5">
            {Array.from({
            length: Math.min(5, Math.ceil(products.length / 2))
          }).map((_, i) => <div key={i} className={cn("h-1.5 rounded-full transition-all", i === 0 ? "w-4 bg-primary" : "w-1.5 bg-muted")} />)}
          </div>
        </div>
      </div>
    </section>;
}
export const RelatedProducts = memo(RelatedProductsComponent);