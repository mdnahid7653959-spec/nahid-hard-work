import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const CJ_API_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

type RateLimitError = Error & { status?: number; retryAfterSeconds?: number };

// Small in-memory cache to protect CJ API from bursts
let productsCache: { expiresAt: number; payload: unknown } | null = null;
let productDetailCache: Map<string, { expiresAt: number; payload: unknown }> = new Map();
// Pending requests map to deduplicate concurrent requests
let pendingDetailRequests: Map<string, Promise<unknown>> = new Map();
let lastApiCallTime = 0;
const MIN_API_INTERVAL_MS = 1500; // 1.5 seconds to be extra safe with CJ's 1 QPS limit

// Global request queue for serializing ALL CJ API calls
let requestQueue: Promise<void> = Promise.resolve();
let isProcessingQueue = false;

interface TokenData {
  access_token: string;
  access_token_expires_at: string;
  refresh_token: string;
  refresh_token_expires_at: string;
}

async function getAccessToken(apiKey: string, supabase: any): Promise<string> {
  const now = new Date();
  
  const { data: tokenData, error: fetchError } = await supabase
    .from("cj_api_tokens")
    .select("*")
    .limit(1)
    .single();
  
  if (!fetchError && tokenData) {
    const accessExpiry = new Date(tokenData.access_token_expires_at);
    const refreshExpiry = new Date(tokenData.refresh_token_expires_at);
    
    if (accessExpiry.getTime() > now.getTime() + 60000) {
      console.log("Using cached access token");
      return tokenData.access_token;
    }
    
    if (refreshExpiry.getTime() > now.getTime() + 60000) {
      console.log("Refreshing access token");
      // Wait for rate limit before refresh
      await waitForRateLimit();
      try {
        const refreshResponse = await fetch(`${CJ_API_BASE}/authentication/refreshAccessToken`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: tokenData.refresh_token }),
        });
        
        const refreshData = await refreshResponse.json();
        
        if (refreshData.code === 200 && refreshData.data) {
          await supabase
            .from("cj_api_tokens")
            .update({
              access_token: refreshData.data.accessToken,
              access_token_expires_at: refreshData.data.accessTokenExpiryDate,
              refresh_token: refreshData.data.refreshToken,
              refresh_token_expires_at: refreshData.data.refreshTokenExpiryDate,
              updated_at: new Date().toISOString(),
            })
            .eq("id", tokenData.id);
          
          return refreshData.data.accessToken;
        }
      } catch (e) {
        console.error("Token refresh failed:", e);
      }
    }
  }
  
  console.log("Getting new access token from CJ API");
  // Wait for rate limit before auth
  await waitForRateLimit();
  const response = await fetch(`${CJ_API_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });
  
  const data = await response.json();
  
  if (data.code !== 200 || !data.data) {
    if (String(data.message || "").toLowerCase().includes("too many requests")) {
      const err = new Error(data.message) as RateLimitError;
      err.status = 429;
      err.retryAfterSeconds = 300;
      throw err;
    }
    throw new Error(data.message || "Failed to authenticate with CJ API");
  }
  
  if (tokenData?.id) {
    await supabase
      .from("cj_api_tokens")
      .update({
        access_token: data.data.accessToken,
        access_token_expires_at: data.data.accessTokenExpiryDate,
        refresh_token: data.data.refreshToken,
        refresh_token_expires_at: data.data.refreshTokenExpiryDate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tokenData.id);
  } else {
    await supabase
      .from("cj_api_tokens")
      .insert({
        access_token: data.data.accessToken,
        access_token_expires_at: data.data.accessTokenExpiryDate,
        refresh_token: data.data.refreshToken,
        refresh_token_expires_at: data.data.refreshTokenExpiryDate,
      });
  }
  
  return data.data.accessToken;
}

// Rate-limit aware delay - ensures minimum gap between ALL API calls
async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCallTime;
  if (timeSinceLastCall < MIN_API_INTERVAL_MS) {
    const waitTime = MIN_API_INTERVAL_MS - timeSinceLastCall;
    console.log(`Rate limit: waiting ${waitTime}ms before next API call`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  lastApiCallTime = Date.now();
}

// Queue a function to run with rate limiting
async function queueApiCall<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    requestQueue = requestQueue.then(async () => {
      try {
        await waitForRateLimit();
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Fetch single product details with deduplication and retry
async function fetchProductDetail(productId: string, accessToken: string, retryCount = 0): Promise<unknown> {
  // Check cache first
  const cached = productDetailCache.get(productId);
  if (cached && cached.expiresAt > Date.now()) {
    console.log(`Cache hit for product ${productId}`);
    return cached.payload;
  }

  // Check if there's already a pending request for this product
  const pending = pendingDetailRequests.get(productId);
  if (pending) {
    console.log(`Returning pending request for product ${productId}`);
    return pending;
  }

  // Create a new request promise with queuing
  const requestPromise = (async () => {
    try {
      const result = await queueApiCall(async () => {
        console.log(`Fetching product detail for ${productId}`);
        
        const detailUrl = new URL(`${CJ_API_BASE}/product/query`);
        detailUrl.searchParams.set("pid", productId);

        const response = await fetch(detailUrl.toString(), {
          method: "GET",
          headers: {
            "CJ-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (data.code !== 200 || !data.data) {
          // Check for rate limit error
          if (String(data.message || "").toLowerCase().includes("too many requests")) {
            const err = new Error(data.message) as RateLimitError;
            err.status = 429;
            err.retryAfterSeconds = 5;
            throw err;
          }
          throw new Error(data.message || "Failed to fetch product details");
        }

        return data.data;
      });

      const p = result as any;
      
      // Extract all images
      const images: string[] = [];
      if (p.productImage) images.push(p.productImage);
      if (p.productImageSet && Array.isArray(p.productImageSet)) {
        images.push(...p.productImageSet);
      }

      // Extract variants
      const variants = (p.variants || []).map((v: any) => ({
        variantId: v.vid,
        variantSku: v.variantSku,
        variantName: v.variantName,
        variantNameEn: v.variantNameEn,
        variantImage: v.variantImage,
        variantStandard: v.variantStandard,
        variantUnit: v.variantUnit,
        variantProperty: v.variantProperty,
        variantVolume: parseFloat(v.variantVolume || 0),
        variantWeight: parseFloat(v.variantWeight || 0),
        variantSellPrice: parseFloat(v.variantSellPrice || p.sellPrice || 0),
      }));

      const formattedProduct = {
        id: p.pid,
        name: p.productName,
        nameEn: p.productNameEn,
        description: p.description,
        descriptionEn: p.descriptionEn,
        sku: p.productSku,
        images: images.length > 0 ? images : [p.bigImage],
        price: parseFloat(p.sellPrice || 0),
        originalPrice: parseFloat(p.sellPrice || 0),
        category: p.categoryName || p.threeCategoryName || "",
        freeShipping: p.addMarkStatus === 1,
        inStock: (p.sourceInventory || 0) > 0,
        variants,
        weight: parseFloat(p.productWeight || 0),
        packingWeight: parseFloat(p.packingWeight || 0),
        listedCount: p.listedNum || 0,
      };

      // Cache for 10 minutes (increased from 5)
      productDetailCache.set(productId, { expiresAt: Date.now() + 600_000, payload: formattedProduct });

      return formattedProduct;
    } catch (error) {
      const err = error as RateLimitError;
      // Retry on rate limit up to 3 times
      if (err?.status === 429 && retryCount < 3) {
        const waitTime = (err.retryAfterSeconds || 5) * 1000;
        console.log(`Rate limited, retrying in ${waitTime}ms (attempt ${retryCount + 1}/3)`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        pendingDetailRequests.delete(productId);
        return fetchProductDetail(productId, accessToken, retryCount + 1);
      }
      throw error;
    } finally {
      // Clean up pending request
      pendingDetailRequests.delete(productId);
    }
  })();

  // Store the pending request
  pendingDetailRequests.set(productId, requestPromise);
  
  return requestPromise;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("CJ_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!apiKey) {
      throw new Error("CJ_API_KEY is not configured");
    }
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase environment variables not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for productId (single product query) or pagination
    let body: any = null;
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch {
        body = null;
      }
    }

    const accessToken = await getAccessToken(apiKey, supabase);

    // If productId is provided, fetch single product details
    if (body?.productId) {
      const product = await fetchProductDetail(body.productId, accessToken);
      return new Response(JSON.stringify({ success: true, product }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get pagination params from body or URL
    const url = new URL(req.url);
    const page = body?.page || url.searchParams.get("page") || "1";
    const size = body?.size || url.searchParams.get("size") || "24"; // Increased default from 12 to 24
    const keyword = body?.keyword || url.searchParams.get("keyword") || "";

    // Create cache key based on page, size, keyword
    const cacheKey = `${page}-${size}-${keyword}`;
    
    // Check cache - but only for page 1 with no keyword (default homepage request)
    if (cacheKey === "1-24-" && productsCache && productsCache.expiresAt > Date.now()) {
      return new Response(JSON.stringify(productsCache.payload), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use queue for product list API call
    const productData = await queueApiCall(async () => {
      const productUrl = new URL(`${CJ_API_BASE}/product/listV2`);
      productUrl.searchParams.set("page", String(page));
      productUrl.searchParams.set("size", String(size));
      productUrl.searchParams.set("productFlag", "0");
      productUrl.searchParams.set("sort", "desc");
      productUrl.searchParams.set("orderBy", "1");
      
      if (keyword) {
        productUrl.searchParams.set("keyWord", keyword);
      }

      console.log(`Fetching product list: page=${page}, size=${size}`);
      const productResponse = await fetch(productUrl.toString(), {
        method: "GET",
        headers: {
          "CJ-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      });

      const data = await productResponse.json();

      if (data.code !== 200) {
        if (String(data.message || "").toLowerCase().includes("too many requests")) {
          const err = new Error(data.message) as RateLimitError;
          err.status = 429;
          err.retryAfterSeconds = 5;
          throw err;
        }
        throw new Error(data.message || "Failed to fetch products from CJ");
      }
      
      return data;
    });

    const content = productData.data?.content?.[0];
    const productList = content?.productList || [];
    
    const formattedProducts = productList.map((p: any) => ({
      id: p.id,
      name: p.nameEn,
      sku: p.sku,
      image: p.bigImage,
      price: parseFloat(p.discountPrice || p.nowPrice || p.sellPrice),
      originalPrice: parseFloat(p.sellPrice),
      category: p.threeCategoryName,
      freeShipping: p.addMarkStatus === 1,
      inStock: (p.warehouseInventoryNum || 0) > 0,
      listedCount: p.listedNum || 0,
    }));

    const payload = {
      success: true,
      products: formattedProducts,
      pagination: {
        page: productData.data?.pageNumber || 1,
        size: productData.data?.pageSize || 12,
        total: productData.data?.totalRecords || 0,
        totalPages: productData.data?.totalPages || 0,
      },
    };

    // Only cache page 1 default requests
    if (cacheKey === "1-24-") {
      productsCache = { expiresAt: Date.now() + 60_000, payload };
    }

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("CJ Products error:", error);

    const err = error as RateLimitError;
    if (err?.status === 429 || String(err?.message || "").toLowerCase().includes("too many requests")) {
      const retryAfterSeconds = err.retryAfterSeconds ?? 300;
      return new Response(
        JSON.stringify({
          success: false,
          error: err.message || "Rate limited by CJ. Please retry shortly.",
          retryAfterSeconds,
          products: [],
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(retryAfterSeconds),
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        products: [],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
