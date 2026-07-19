import { memo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, X, Star } from "lucide-react";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const RecentlyViewedSection = () => {
  const { recentlyViewed, isLoading, clearRecentlyViewed } = useRecentlyViewed();

  if (isLoading || recentlyViewed.length === 0) {
    return null;
  }

  return (
    <div className="py-3 sm:py-5">
      <div className="bg-card border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-gradient-to-r from-muted/50 to-muted/30">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="font-bold text-base sm:text-lg leading-tight">Recently Viewed</h2>
              <p className="text-xs text-muted-foreground">Your browsing history</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearRecentlyViewed}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        </div>

        {/* Products Scroll */}
        <ScrollArea className="w-full">
          <div className="flex gap-2 sm:gap-3 p-3 sm:p-4">
            {recentlyViewed.slice(0, 10).map((product) => {
              const discountPercent = product.discount_price
                ? Math.round(((product.regular_price - product.discount_price) / product.regular_price) * 100)
                : 0;
              const displayPrice = product.discount_price || product.regular_price;

              return (
                <Link
                  key={product.id}
                  to={`/product/${product.slug}`}
                  className="w-[120px] sm:w-[140px] flex-shrink-0 group"
                >
                  <div className="bg-background border rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/30">
                    {/* Image */}
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      <img
                        src={product.image_url || "/placeholder.svg"}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      {discountPercent > 0 && (
                        <div className="absolute top-1.5 left-1.5 bg-destructive text-destructive-foreground text-[9px] font-bold px-1.5 py-0.5 rounded">
                          -{discountPercent}%
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-2">
                      <h3 className="text-xs font-medium line-clamp-2 min-h-[2rem] text-foreground group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>

                      {/* Rating */}
                      {product.rating_average && (
                        <div className="flex items-center gap-0.5 mt-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-[10px] font-medium">{product.rating_average.toFixed(1)}</span>
                        </div>
                      )}

                      {/* Price */}
                      <div className="mt-1">
                        <span className="text-sm font-bold text-primary">
                          ৳{displayPrice.toLocaleString()}
                        </span>
                        {product.discount_price && (
                          <span className="text-[10px] text-muted-foreground line-through ml-1">
                            ৳{product.regular_price.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
            
            {/* View All Card */}
            {recentlyViewed.length > 10 && (
              <Link
                to="/products"
                className="w-[120px] sm:w-[140px] flex-shrink-0 flex flex-col items-center justify-center bg-muted/50 rounded-xl border-2 border-dashed hover:border-primary/50 transition-colors min-h-[180px]"
              >
                <ChevronRight className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm font-medium text-muted-foreground">View All</span>
                <span className="text-xs text-muted-foreground">{recentlyViewed.length} items</span>
              </Link>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
};

export default memo(RecentlyViewedSection);
