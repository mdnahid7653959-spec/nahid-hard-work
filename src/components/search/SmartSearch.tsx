import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Clock, TrendingUp, ChevronRight, Loader2, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSearchSuggestions } from "@/hooks/useSearchSuggestions";
import { cn } from "@/lib/utils";

interface SmartSearchProps {
  className?: string;
  placeholder?: string;
  onSearch?: (query: string) => void;
}

const trendingSearches = [
  "Wireless earbuds",
  "Phone cases",
  "Smart watch",
  "LED lights",
  "Summer dress",
  "Laptop bag",
];

export function SmartSearch({ className, placeholder = "Search products...", onSearch }: SmartSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    suggestions,
    searchHistory,
    isLoading,
    saveToHistory,
    clearHistory,
    removeHistoryItem,
  } = useSearchSuggestions(query);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (searchTerm: string) => {
    if (searchTerm.trim()) {
      saveToHistory(searchTerm);
      setShowDropdown(false);
      setQuery("");
      if (onSearch) {
        onSearch(searchTerm);
      } else {
        navigate(`/products?search=${encodeURIComponent(searchTerm)}`);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleSuggestionClick = (slug: string) => {
    setShowDropdown(false);
    setQuery("");
    navigate(`/product/${slug}`);
  };

  return (
    <div className={cn("relative w-full", className)}>
      <form onSubmit={handleSubmit} className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            setShowDropdown(true);
          }}
          placeholder={placeholder}
          className="w-full h-10 pl-10 pr-10 rounded-full bg-background border-muted-foreground/20 focus:border-primary"
        />
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
            onClick={() => setQuery("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </form>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-card border rounded-xl shadow-lg overflow-hidden z-50 max-h-[70vh] overflow-y-auto"
        >
          {/* Loading state */}
          {isLoading && query.length >= 2 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {/* Suggestions */}
          {!isLoading && suggestions.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-medium text-muted-foreground px-2 py-1 mb-1">
                Products
              </div>
              {suggestions.map((product) => {
                const displayPrice = product.discount_price || product.regular_price;
                return (
                  <button
                    key={product.id}
                    onClick={() => handleSuggestionClick(product.slug)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Search className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{product.name}</p>
                      {product.category_name && (
                        <p className="text-xs text-muted-foreground">{product.category_name}</p>
                      )}
                      <p className="text-sm font-bold text-primary">৳{displayPrice.toLocaleString()}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </button>
                );
              })}
              
              {/* Search for query */}
              <button
                onClick={() => handleSearch(query)}
                className="w-full flex items-center gap-3 p-3 mt-2 border-t text-primary font-medium hover:bg-muted/30 transition-colors"
              >
                <Search className="h-4 w-4" />
                <span>Search for "{query}"</span>
                <ChevronRight className="h-4 w-4 ml-auto" />
              </button>
            </div>
          )}

          {/* No query - show history and trending */}
          {!query && (
            <>
              {/* Search History */}
              {searchHistory.length > 0 && (
                <div className="p-2 border-b">
                  <div className="flex items-center justify-between px-2 py-1 mb-1">
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Recent Searches
                    </span>
                    <button
                      onClick={clearHistory}
                      className="text-xs text-primary hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  {searchHistory.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 group"
                    >
                      <button
                        onClick={() => handleSearch(item.search_term)}
                        className="flex-1 flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                      >
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{item.search_term}</span>
                      </button>
                      <button
                        onClick={() => removeHistoryItem(item.id)}
                        className="p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Trending Searches */}
              <div className="p-2">
                <div className="text-xs font-medium text-muted-foreground px-2 py-1 mb-1 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Trending Searches
                </div>
                <div className="flex flex-wrap gap-2 p-2">
                  {trendingSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => handleSearch(term)}
                      className="px-3 py-1.5 bg-muted/50 hover:bg-muted rounded-full text-xs font-medium transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* No results */}
          {!isLoading && query.length >= 2 && suggestions.length === 0 && (
            <div className="p-6 text-center">
              <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No products found for "{query}"</p>
              <button
                onClick={() => handleSearch(query)}
                className="mt-3 text-primary text-sm font-medium hover:underline"
              >
                Search anyway →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
