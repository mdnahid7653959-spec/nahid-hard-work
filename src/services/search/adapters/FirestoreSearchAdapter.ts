import { collection, getDocs, query as fsQuery, where, limit as fsLimit } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import {
  ISearchEngineAdapter,
  SearchOptions,
  SearchResult,
  SearchSuggestions,
  SearchProductResult
} from "../ISearchEngineAdapter";
import { synonymManager } from "../SynonymManager";
import { fuzzyMatchToken, tokenizeText, normalizeText, getEditDistance } from "../FuzzySearchEngine";
import { searchAnalytics } from "../SearchAnalyticsService";

const defaultImages = [
  "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&h=600&fit=crop"
];

export class FirestoreSearchAdapter implements ISearchEngineAdapter {
  private indexedProducts: any[] = [];
  private indexedCategories: { id: string; name: string; slug: string }[] = [];
  private indexedBrands: { id: string; name: string; slug: string }[] = [];
  private indexedSellers: { id: string; name: string }[] = [];
  private isLoaded = false;
  private lastFetchTime = 0;
  private CACHE_TTL = 3 * 60 * 1000; // 3 minutes cache

  public async buildIndex(products?: any[]): Promise<void> {
    const now = Date.now();
    if (this.isLoaded && now - this.lastFetchTime < this.CACHE_TTL && !products) {
      return;
    }

    await synonymManager.init();

    try {
      if (products && products.length > 0) {
        this.indexedProducts = products;
      } else {
        // Fetch from Firestore products collection
        const snap = await getDocs(collection(db, "products"));
        let list: any[] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Fallback: If local Firestore is empty, fetch live catalog via proxy
        if (list.length === 0) {
          try {
            const res = await fetch("/api/mohasagor/api/reseller/product", {
              headers: {
                "api-key": "A8niclztH9JtzS4t",
                "secret-key": "2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8"
              }
            });
            if (res.ok) {
              const data = await res.json();
              const raw = data.products || (Array.isArray(data) ? data : []);
              if (Array.isArray(raw) && raw.length > 0) {
                list = raw.map((p: any, idx: number) => ({
                  id: p.id.toString(),
                  name: p.name,
                  slug: `product-${p.id}`,
                  regular_price: parseFloat(p.price) || 0,
                  discount_price: parseFloat(p.sale_price) || null,
                  category: p.category_name || "General",
                  brand: p.brand_name || "Generic",
                  seller_name: "Mohasagor Marketplace",
                  sku: p.sku || `MOH-${p.id}`,
                  product_images: p.product_images
                    ? p.product_images.map((img: any) => ({
                        image_url: img.product_image?.startsWith("http")
                          ? img.product_image
                          : `https://mohasagor.com.bd/${img.product_image}`
                      }))
                    : [{ image_url: p.thumbnail_img ? `https://mohasagor.com.bd/${p.thumbnail_img}` : defaultImages[idx % defaultImages.length] }],
                  rating_average: 4.8,
                  rating_count: 18,
                  sold_count: parseInt(p.sold) || 50,
                  in_stock: true,
                  status: "active"
                }));
              }
            }
          } catch (e) {
            console.warn("[FirestoreSearchAdapter] Catalog proxy warning:", e);
          }
        }

        this.indexedProducts = list;
      }

      // Build categories & brands facets index
      const categorySet = new Map<string, { id: string; name: string; slug: string }>();
      const brandSet = new Map<string, { id: string; name: string; slug: string }>();
      const sellerSet = new Map<string, { id: string; name: string }>();

      this.indexedProducts.forEach((p) => {
        if (p.category) {
          const cName = p.category;
          const cSlug = cName.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
          categorySet.set(cName, { id: cSlug, name: cName, slug: cSlug });
        }
        if (p.brand) {
          const bName = p.brand;
          const bSlug = bName.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
          brandSet.set(bName, { id: bSlug, name: bName, slug: bSlug });
        }
        if (p.seller_name) {
          sellerSet.set(p.seller_name, { id: p.seller_id || p.seller_name, name: p.seller_name });
        }
      });

      this.indexedCategories = Array.from(categorySet.values());
      this.indexedBrands = Array.from(brandSet.values());
      this.indexedSellers = Array.from(sellerSet.values());

      this.isLoaded = true;
      this.lastFetchTime = now;
    } catch (err) {
      console.warn("[FirestoreSearchAdapter] Build index warning:", err);
    }
  }

  public async indexProduct(product: any): Promise<void> {
    const existingIdx = this.indexedProducts.findIndex((p) => p.id === product.id);
    if (existingIdx >= 0) {
      this.indexedProducts[existingIdx] = product;
    } else {
      this.indexedProducts.unshift(product);
    }
  }

  public async removeProduct(id: string): Promise<void> {
    this.indexedProducts = this.indexedProducts.filter((p) => p.id !== id);
  }

  public async getSuggestions(rawQuery: string): Promise<SearchSuggestions> {
    await this.buildIndex();
    const queryStr = rawQuery.toLowerCase().trim();

    if (!queryStr) {
      return {
        products: [],
        categories: this.indexedCategories.slice(0, 4),
        brands: this.indexedBrands.slice(0, 4),
        sellers: this.indexedSellers.slice(0, 4),
        trending: ["Wireless earbuds", "Smart watch", "Mobile phone", "Laptop", "Gaming mouse"],
        recent: searchAnalytics.getRecentSearches()
      };
    }

    const searchResult = await this.search(queryStr, { limit: 8 });

    const suggestedProducts = searchResult.products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      image: p.image,
      price: p.price,
      category: p.category
    }));

    const suggestedCategories = this.indexedCategories.filter(
      (c) => c.name.toLowerCase().includes(queryStr) || queryStr.includes(c.name.toLowerCase())
    ).slice(0, 3);

    const suggestedBrands = this.indexedBrands.filter(
      (b) => b.name.toLowerCase().includes(queryStr) || queryStr.includes(b.name.toLowerCase())
    ).slice(0, 3);

    const suggestedSellers = this.indexedSellers.filter(
      (s) => s.name.toLowerCase().includes(queryStr) || queryStr.includes(s.name.toLowerCase())
    ).slice(0, 3);

    return {
      products: suggestedProducts,
      categories: suggestedCategories,
      brands: suggestedBrands,
      sellers: suggestedSellers,
      trending: ["Wireless earbuds", "Smart watch", "Mobile phone", "Laptop"],
      recent: searchAnalytics.getRecentSearches()
    };
  }

  public async search(rawQuery: string, options: SearchOptions = {}): Promise<SearchResult> {
    await this.buildIndex();
    const queryStr = rawQuery.toLowerCase().trim();

    // 1. Expand query with bilingual synonym engine
    const { expandedTerms, matchedRules } = synonymManager.expandQuery(queryStr);

    // 2. Score and rank products
    const scoredProducts: SearchProductResult[] = [];

    for (const p of this.indexedProducts) {
      let score = 0;
      let matchType: SearchProductResult["matchType"] = "partial";

      const pName = (p.name || "").toLowerCase();
      const pDesc = (p.description || p.short_description || "").toLowerCase();
      const pCat = (p.category || "").toLowerCase();
      const pBrand = (p.brand || "").toLowerCase();
      const pSku = (p.sku || "").toLowerCase();
      const pTags = Array.isArray(p.tags) ? p.tags.map((t: string) => t.toLowerCase()) : [];
      const pSeller = (p.seller_name || "").toLowerCase();

      // Check Exact SKU
      if (queryStr && (pSku === queryStr || pSku.includes(queryStr))) {
        score += 150;
        matchType = "sku";
      }

      // Check Exact Name Match
      if (pName === queryStr) {
        score += 100;
        matchType = "exact";
      } else if (pName.startsWith(queryStr)) {
        score += 75;
        matchType = "prefix";
      } else if (pName.includes(queryStr)) {
        score += 55;
        matchType = "partial";
      }

      // Check Expanded Terms & Synonyms
      for (const term of expandedTerms) {
        if (!term) continue;
        if (pName.includes(term)) {
          score += 65;
          if (matchType !== "exact" && matchType !== "sku") matchType = "synonym";
        }
        if (pCat.includes(term)) {
          score += 50;
          if (matchType === "partial") matchType = "semantic";
        }
        if (pBrand.includes(term)) {
          score += 45;
        }
        if (pTags.some((tag: string) => tag.includes(term))) {
          score += 40;
        }
        if (pDesc.includes(term)) {
          score += 25;
        }
      }

      // Fuzzy Typo Matching for single/multi-word queries
      if (score === 0 && queryStr.length >= 3) {
        const queryTokens = tokenizeText(queryStr);
        const nameTokens = tokenizeText(pName);

        for (const qTok of queryTokens) {
          for (const nTok of nameTokens) {
            const fuzzy = fuzzyMatchToken(qTok, nTok);
            if (fuzzy.isMatch) {
              score += fuzzy.score;
              matchType = "fuzzy";
            }
          }
        }
      }

      // Apply Boosters for popular/rated/featured items
      if (score > 0) {
        if (p.rating_average) score += Number(p.rating_average) * 4;
        if (p.sold_count) score += Math.min(30, Number(p.sold_count) * 0.2);
        if (p.is_featured) score += 15;
        if (p.is_best_seller) score += 10;
        if (p.in_stock !== false) score += 10;
        if (p.custom_boost) score += Number(p.custom_boost);

        // Map primary image
        const primaryImage = p.product_images?.find((i: any) => i.is_primary)?.image_url;
        const firstImage = p.product_images?.[0]?.image_url;
        const image = primaryImage || firstImage || defaultImages[0];

        scoredProducts.push({
          id: p.id,
          name: p.name,
          slug: p.slug || `product-${p.id}`,
          image,
          price: parseFloat(p.discount_price || p.regular_price || p.price) || 0,
          originalPrice: p.discount_price ? parseFloat(p.regular_price) : undefined,
          rating: Number(p.rating_average) || 4.7,
          reviews: p.rating_count || 12,
          sold: p.sold_count || 35,
          category: p.category,
          brand: p.brand,
          sellerId: p.seller_id,
          sellerName: p.seller_name,
          sku: p.sku,
          isNew: p.is_new_arrival ?? false,
          isBestSeller: p.is_best_seller ?? false,
          isFeatured: p.is_featured ?? false,
          inStock: p.in_stock !== false,
          score,
          matchType
        });
      }
    }

    // 3. Filter results based on options
    let filtered = scoredProducts;

    if (options.category && options.category !== "all") {
      const c = options.category.toLowerCase();
      filtered = filtered.filter((p) => p.category?.toLowerCase().includes(c));
    }
    if (options.brand && options.brand !== "all") {
      const b = options.brand.toLowerCase();
      filtered = filtered.filter((p) => p.brand?.toLowerCase().includes(b));
    }
    if (options.sellerId) {
      filtered = filtered.filter((p) => p.sellerId === options.sellerId || p.sellerName === options.sellerId);
    }
    if (options.minPrice !== undefined) {
      filtered = filtered.filter((p) => p.price >= options.minPrice!);
    }
    if (options.maxPrice !== undefined) {
      filtered = filtered.filter((p) => p.price <= options.maxPrice!);
    }
    if (options.minRating !== undefined) {
      filtered = filtered.filter((p) => p.rating >= options.minRating!);
    }
    if (options.inStockOnly) {
      filtered = filtered.filter((p) => p.inStock !== false);
    }
    if (options.hasDiscount) {
      filtered = filtered.filter((p) => p.originalPrice !== undefined && p.originalPrice > p.price);
    }

    // 4. Sort results
    const sortBy = options.sortBy || "relevance";
    filtered.sort((a, b) => {
      if (sortBy === "relevance") return b.score - a.score;
      if (sortBy === "popularity") return b.sold - a.sold;
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "newest") return b.isNew ? 1 : -1;
      return b.score - a.score;
    });

    // Log analytics asynchronously
    if (queryStr) {
      searchAnalytics.logSearch(queryStr, filtered.length);
    }

    // 5. Pagination
    const page = options.page || 1;
    const limit = options.limit || 20;
    const startIndex = (page - 1) * limit;
    const paginatedProducts = filtered.slice(startIndex, startIndex + limit);
    const totalPages = Math.ceil(filtered.length / limit) || 1;

    // 6. Build Facets
    const categoryFacetMap: Record<string, number> = {};
    const brandFacetMap: Record<string, number> = {};
    const sellerFacetMap: Record<string, { id: string; name: string; count: number }> = {};
    let minP = Infinity;
    let maxP = 0;

    scoredProducts.forEach((p) => {
      if (p.category) categoryFacetMap[p.category] = (categoryFacetMap[p.category] || 0) + 1;
      if (p.brand) brandFacetMap[p.brand] = (brandFacetMap[p.brand] || 0) + 1;
      if (p.sellerName) {
        if (!sellerFacetMap[p.sellerName]) {
          sellerFacetMap[p.sellerName] = { id: p.sellerId || p.sellerName, name: p.sellerName, count: 0 };
        }
        sellerFacetMap[p.sellerName].count += 1;
      }
      if (p.price < minP) minP = p.price;
      if (p.price > maxP) maxP = p.price;
    });

    return {
      products: paginatedProducts,
      total: filtered.length,
      page,
      totalPages,
      appliedSynonyms: matchedRules,
      facets: {
        categories: Object.entries(categoryFacetMap).map(([name, count]) => ({ name, count })),
        brands: Object.entries(brandFacetMap).map(([name, count]) => ({ name, count })),
        sellers: Object.values(sellerFacetMap),
        priceRange: { min: isFinite(minP) ? minP : 0, max: maxP || 1000 }
      }
    };
  }
}

export const firestoreSearchAdapter = new FirestoreSearchAdapter();
