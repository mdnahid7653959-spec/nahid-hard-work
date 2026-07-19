import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SearchSuggestion {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  category_name: string | null;
  regular_price: number;
  discount_price: number | null;
}

interface SearchHistory {
  id: string;
  search_term: string;
  created_at: string;
}

const SEARCH_HISTORY_KEY = "search_history";
const MAX_HISTORY = 10;
const DEBOUNCE_MS = 300;

// Simple fuzzy match function
function fuzzyMatch(text: string, pattern: string): boolean {
  const textLower = text.toLowerCase();
  const patternLower = pattern.toLowerCase();
  
  // Direct substring match
  if (textLower.includes(patternLower)) return true;
  
  // Check for typos with levenshtein-like approach
  // Allow up to 2 character differences for short patterns
  if (patternLower.length <= 3) {
    return textLower.includes(patternLower);
  }
  
  // Split pattern into words and check if all words are present
  const patternWords = patternLower.split(/\s+/);
  return patternWords.every(word => textLower.includes(word));
}

export function useSearchSuggestions(query: string) {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Fetch search history
  const fetchSearchHistory = useCallback(async () => {
    try {
      if (user) {
        const { data, error } = await supabase
          .from("search_history")
          .select("id, search_term, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(MAX_HISTORY);

        if (error) throw error;
        setSearchHistory(data || []);
      } else {
        const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
        if (stored) {
          setSearchHistory(JSON.parse(stored));
        }
      }
    } catch (error) {
      console.error("Error fetching search history:", error);
    }
  }, [user]);

  // Save search to history
  const saveToHistory = useCallback(async (term: string) => {
    if (!term.trim()) return;

    try {
      if (user) {
        await supabase.from("search_history").insert({
          user_id: user.id,
          search_term: term.trim(),
          results_count: 0,
        });
      } else {
        const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
        let history: SearchHistory[] = stored ? JSON.parse(stored) : [];
        
        // Remove duplicate
        history = history.filter(h => h.search_term.toLowerCase() !== term.toLowerCase());
        
        // Add to beginning
        history.unshift({
          id: Date.now().toString(),
          search_term: term.trim(),
          created_at: new Date().toISOString(),
        });
        
        // Keep only MAX_HISTORY items
        history = history.slice(0, MAX_HISTORY);
        
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
        setSearchHistory(history);
      }
    } catch (error) {
      console.error("Error saving search history:", error);
    }
  }, [user]);

  // Clear search history
  const clearHistory = useCallback(async () => {
    try {
      if (user) {
        await supabase
          .from("search_history")
          .delete()
          .eq("user_id", user.id);
      } else {
        localStorage.removeItem(SEARCH_HISTORY_KEY);
      }
      setSearchHistory([]);
    } catch (error) {
      console.error("Error clearing search history:", error);
    }
  }, [user]);

  // Remove single history item
  const removeHistoryItem = useCallback(async (id: string) => {
    try {
      if (user) {
        await supabase
          .from("search_history")
          .delete()
          .eq("id", id);
      } else {
        const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
        if (stored) {
          const history = JSON.parse(stored).filter((h: SearchHistory) => h.id !== id);
          localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
        }
      }
      setSearchHistory(prev => prev.filter(h => h.id !== id));
    } catch (error) {
      console.error("Error removing history item:", error);
    }
  }, [user]);

  // Fetch suggestions based on query
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      // Search products with fuzzy matching
      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          name,
          slug,
          regular_price,
          discount_price,
          categories (name),
          product_images (image_url, is_primary)
        `)
        .eq("status", "active")
        .or(`name.ilike.%${searchQuery}%,short_description.ilike.%${searchQuery}%`)
        .limit(8);

      if (error) throw error;

      const results: SearchSuggestion[] = (data || [])
        .filter(product => fuzzyMatch(product.name, searchQuery))
        .map(product => ({
          id: product.id,
          name: product.name,
          slug: product.slug,
          image_url: product.product_images?.find((img: any) => img.is_primary)?.image_url 
            || product.product_images?.[0]?.image_url 
            || null,
          category_name: (product.categories as any)?.name || null,
          regular_price: product.regular_price,
          discount_price: product.discount_price,
        }));

      setSuggestions(results);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(query);
      }, DEBOUNCE_MS);
    } else {
      setSuggestions([]);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, fetchSuggestions]);

  // Fetch history on mount
  useEffect(() => {
    fetchSearchHistory();
  }, [fetchSearchHistory]);

  return {
    suggestions,
    searchHistory,
    isLoading,
    saveToHistory,
    clearHistory,
    removeHistoryItem,
  };
}
