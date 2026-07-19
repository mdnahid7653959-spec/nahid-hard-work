import { memo } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const RecentlyViewedSection = () => {
  const { recentlyViewed, isLoading, clearRecentlyViewed } = useRecentlyViewed();

  if (isLoading || recentlyViewed.length === 0) {
    return null;
  }

  return (
    <div className="py-2">
      <div className="bg-card border rounded-xl overflow-hidden">
        {/* Compact Header */}
        <div className="flex items-center justify-between px-2.5 py-1.5 border-b">
          <h2 className="font-semibold text-xs">Recently Viewed</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearRecentlyViewed}
            className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Tiny products scroll */}
        <ScrollArea className="w-full">
          <div className="flex gap-1.5 p-2">
            {recentlyViewed.slice(0, 15).map((product) => {
              const discountPercent = product.discount_price
                ? Math.round(((product.regular_price - product.discount_price) / product.regular_price) * 100)
                : 0;
              const displayPrice = product.discount_price || product.regular_price;

              return (
                <Link
                  key={product.id}
                  to={`/product/${product.slug}`}
                  className="w-[64px] flex-shrink-0 group"
                >
                  <div className="relative aspect-square overflow-hidden rounded-md bg-muted border">
                    <img
                      src={product.image_url || "/placeholder.svg"}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      loading="lazy"
                    />
                    {discountPercent > 0 && (
                      <div className="absolute top-0.5 left-0.5 bg-destructive text-destructive-foreground text-[8px] font-bold px-1 py-px rounded-sm leading-none">
                        -{discountPercent}%
                      </div>
                    )}
                  </div>
                  <div className="mt-1 text-[10px] font-semibold text-primary text-center leading-none truncate">
                    ৳{displayPrice.toLocaleString()}
                  </div>
                </Link>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" className="h-1.5" />
        </ScrollArea>
      </div>
    </div>
  );
};

export default memo(RecentlyViewedSection);
