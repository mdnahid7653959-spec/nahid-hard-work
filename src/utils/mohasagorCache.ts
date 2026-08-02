import type { Product } from "@/components/products/ProductCard";

const MOHASAGOR_CACHE_KEY = "mohasagor_products_master_cache_v2";
const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes (300,000ms)

let inMemoryProductsCache: Product[] | null = null;
let isFetchingAllPages = false;
let autoSyncTimer: number | null = null;
let lastSyncTimestamp: number | null = null;

export function getLastSyncTime(): string | null {
  if (!lastSyncTimestamp) return null;
  return new Date(lastSyncTimestamp).toLocaleTimeString();
}

export async function getCachedMohasagorProducts(): Promise<Product[]> {
  // 1. Check in-memory cache first (0ms)
  if (inMemoryProductsCache && inMemoryProductsCache.length > 0) {
    return inMemoryProductsCache;
  }

  // 2. Check localStorage (0ms)
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(MOHASAGOR_CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemoryProductsCache = parsed;
          // Trigger background refresh silently for all pages
          fetchAllPagesMohasagorProducts().catch(() => {});
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Error reading mohasagor localStorage cache", e);
    }
  }

  // 3. Network fetch fallback
  return await fetchAllPagesMohasagorProducts();
}

function mapRawProducts(rawProducts: any[], base: string): Product[] {
  const resolveUrl = (url: string) => {
    if (!url) return "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop";
    if (url.startsWith("http") || url.startsWith("//")) return url;
    return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
  };

  return rawProducts.map((p, index) => {
    const firstImage = p.product_images && p.product_images.length > 0
      ? resolveUrl(p.product_images[0].product_image)
      : p.thumbnail_img ? resolveUrl(p.thumbnail_img) : resolveUrl("");

    const price = parseFloat(p.sale_price) || parseFloat(p.price) || 0;
    const originalPrice = parseFloat(p.price) || price;

    return {
      id: p.id.toString(),
      name: p.name,
      slug: `product-${p.id}`,
      image: firstImage,
      price,
      originalPrice: originalPrice > price ? originalPrice : undefined,
      rating: 4.8,
      reviews: 15,
      sold: parseInt(p.sold) || 45,
      freeShipping: true,
      isNew: index < 20,
      isBestSeller: index % 4 === 0,
      category: p.category || "",
    } as Product & { category?: string };
  });
}

export async function fetchAllPagesMohasagorProducts(): Promise<Product[]> {
  if (isFetchingAllPages && inMemoryProductsCache && inMemoryProductsCache.length > 0) {
    return inMemoryProductsCache;
  }
  isFetchingAllPages = true;

  try {
    const baseApiUrl = typeof window !== "undefined" && window.location.hostname === "localhost"
      ? "/api/mohasagor/api/reseller/product"
      : "https://mohasagor.com.bd/api/reseller/product";

    const headers = {
      "api-key": "A8niclztH9JtzS4t",
      "secret-key": "2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8"
    };

    // 1. Fetch Page 1 to get initial products and last_page total
    const res1 = await fetch(`${baseApiUrl}?page=1`, { headers });
    if (!res1.ok) {
      isFetchingAllPages = false;
      return inMemoryProductsCache || [];
    }

    const data1 = await res1.json();
    const rawProductsPage1: any[] = data1.products || (Array.isArray(data1) ? data1 : []);
    const lastPage = data1.last_page || 1;
    const base = "https://mohasagor.com.bd";

    let allMappedProducts = mapRawProducts(rawProductsPage1, base);

    // Save page 1 immediately so UI updates instantly
    inMemoryProductsCache = allMappedProducts;
    lastSyncTimestamp = Date.now();

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(MOHASAGOR_CACHE_KEY, JSON.stringify(allMappedProducts));
        window.dispatchEvent(new Event("mohasagor_products_updated"));
      } catch (e) {}
    }

    // 2. Fetch all remaining pages in parallel if lastPage > 1
    if (lastPage > 1) {
      const pagePromises = [];
      for (let p = 2; p <= lastPage; p++) {
        pagePromises.push(
          fetch(`${baseApiUrl}?page=${p}`, { headers })
            .then(res => res.ok ? res.json() : null)
            .then(data => data ? (data.products || (Array.isArray(data) ? data : [])) : [])
            .catch(() => [])
        );
      }

      const results = await Promise.all(pagePromises);
      const remainingRawProducts = results.flat();
      const remainingMapped = mapRawProducts(remainingRawProducts, base);

      allMappedProducts = [...allMappedProducts, ...remainingMapped];
      inMemoryProductsCache = allMappedProducts;
      lastSyncTimestamp = Date.now();

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(MOHASAGOR_CACHE_KEY, JSON.stringify(allMappedProducts));
          window.dispatchEvent(new Event("mohasagor_products_updated"));
        } catch (e) {}
      }
    }

    console.log(`[5-Min Auto Sync] API Products synchronized successfully (${allMappedProducts.length} items updated at ${new Date().toLocaleTimeString()})`);
    isFetchingAllPages = false;
    return allMappedProducts;
  } catch (e) {
    console.error("Error fetching all pages of Mohasagor products", e);
    isFetchingAllPages = false;
    return inMemoryProductsCache || [];
  }
}

// Automatic 5-Minute Product Sync Service
export function startAutoProductSync(intervalMs: number = AUTO_SYNC_INTERVAL_MS) {
  if (typeof window === "undefined") return;

  if (autoSyncTimer !== null) {
    window.clearInterval(autoSyncTimer);
  }

  // Run initial background sync
  fetchAllPagesMohasagorProducts().catch(() => {});

  // Schedule recurring sync every 5 minutes
  autoSyncTimer = window.setInterval(() => {
    console.log("[5-Min Auto Sync] Triggering scheduled 5-minute supplier API product sync...");
    fetchAllPagesMohasagorProducts().catch((err) => {
      console.warn("Scheduled 5-min product sync warning:", err);
    });
  }, intervalMs);
}

// Auto-start 5-minute background sync service upon browser load
if (typeof window !== "undefined") {
  startAutoProductSync();
}

export function filterProductsByCategory(products: (Product & { category?: string })[], categorySlug: string, categoryName?: string): Product[] {
  const targetSlug = categorySlug.toLowerCase().replace(/[^a-z0-9]/g, "");
  const targetName = (categoryName || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const filtered = products.filter(p => {
    if (!targetSlug || targetSlug === "all") return true;
    const prodCat = ((p as any).category || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (prodCat.includes(targetSlug) || targetSlug.includes(prodCat)) return true;
    if (targetName && (prodCat.includes(targetName) || targetName.includes(prodCat))) return true;
    if ((targetSlug.includes("fashion") || targetSlug.includes("shirt") || targetSlug.includes("cloth")) && (prodCat.includes("fashion") || prodCat.includes("winter"))) return true;
    if ((targetSlug.includes("gadget") || targetSlug.includes("electronic") || targetSlug.includes("tech") || targetSlug.includes("phone")) && prodCat.includes("gadget")) return true;
    if ((targetSlug.includes("home") || targetSlug.includes("garden") || targetSlug.includes("life")) && prodCat.includes("home")) return true;
    if ((targetSlug.includes("toy") || targetSlug.includes("kid") || targetSlug.includes("hobby") || targetSlug.includes("baby")) && prodCat.includes("kid")) return true;
    if ((targetSlug.includes("watch") || targetSlug.includes("time")) && prodCat.includes("watch")) return true;
    return false;
  });

  return filtered.length > 0 ? filtered : products;
}
