import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SECRET_KEY = "durtup-api-gateway-salt-secure-key-2026";

// Reversible XOR Decryption supporting unicode base64
function decryptCredentials(encryptedBase64: string): any {
  if (!encryptedBase64) return null;
  try {
    const binary = atob(encryptedBase64);
    let plainText = "";
    for (let i = 0; i < binary.length; i++) {
      const charCode = binary.charCodeAt(i);
      const keyChar = SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
      plainText += String.fromCharCode(charCode ^ keyChar);
    }
    const decoded = decodeURIComponent(escape(plainText));
    return JSON.parse(decoded);
  } catch (error) {
    console.error("Deno decryption failed:", error);
    return null;
  }
}

// JSON Path Extractor Helper
function getNestedValue(obj: any, path: string): any {
  if (!path || !obj) return undefined;
  const parts = path.trim().split(".");
  let current = obj;

  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      current = current[key];
      if (Array.isArray(current)) {
        current = current[parseInt(index, 10)];
      } else {
        return undefined;
      }
    } else {
      current = current[part];
    }
  }
  return current;
}

// Pricing calculator
function calculatePrice(supplierPrice: number, rules: any, categoryId?: string, brandId?: string): { regular_price: number, discount_price: number } {
  let markupType = rules.markup_type || 'percentage'; // 'percentage' | 'fixed'
  let markupValue = Number(rules.markup_value || 0);
  let commissionMargin = Number(rules.commission_margin || 0);
  let minProfit = Number(rules.min_profit || 0);
  let maxProfit = Number(rules.max_profit || 999999);
  let conversionRate = Number(rules.conversion_rate || 1); // currency rate, e.g. USD to BDT
  
  // Convert original supplier price to BDT
  const convertedBase = supplierPrice * conversionRate;
  
  // Apply category specific rules if matching
  if (categoryId && rules.category_rules?.[categoryId]) {
    const cRule = rules.category_rules[categoryId];
    markupType = cRule.markup_type || markupType;
    markupValue = Number(cRule.markup_value !== undefined ? cRule.markup_value : markupValue);
  }

  // Apply brand specific rules if matching
  if (brandId && rules.brand_rules?.[brandId]) {
    const bRule = rules.brand_rules[brandId];
    markupType = bRule.markup_type || markupType;
    markupValue = Number(bRule.markup_value !== undefined ? bRule.markup_value : markupValue);
  }

  let profit = 0;
  if (markupType === 'percentage') {
    profit = convertedBase * (markupValue / 100);
  } else {
    profit = markupValue;
  }

  // Bound profit limits
  if (profit < minProfit) profit = minProfit;
  if (profit > maxProfit) profit = maxProfit;

  // Add commission
  const commission = convertedBase * (commissionMargin / 100);

  // Final selling price
  let sellingPrice = convertedBase + profit + commission;

  // Auto round prices (e.g. 999, 1499, 1999)
  if (rules.auto_round) {
    const roundTo = Number(rules.round_to || 99); // round last digits to 99
    sellingPrice = Math.floor(sellingPrice / 100) * 100 + roundTo;
  } else {
    sellingPrice = Math.round(sellingPrice);
  }

  return {
    regular_price: sellingPrice,
    discount_price: sellingPrice * 0.95 // mock discount 5%
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const { action, supplierId, payload } = body;

    if (!action || !supplierId) {
      return new Response(JSON.stringify({ error: "Missing action or supplierId" }), { status: 400, headers: corsHeaders });
    }

    // Validate admin session for admin-only actions (sync-products, test-connection)
    if (action === "test-connection" || action === "sync-products") {
      const adminToken = req.headers.get("x-admin-token");
      if (!adminToken) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      }

      const { data: session } = await supabase
        .from("admin_sessions")
        .select("admin_id")
        .eq("session_token", adminToken)
        .eq("is_valid", true)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (!session) {
        return new Response(JSON.stringify({ error: "Invalid admin session" }), { status: 401, headers: corsHeaders });
      }
    }

    // Fetch Supplier details
    const { data: supplier, error: fetchErr } = await supabase
      .from("supplier_integrations")
      .select("*")
      .eq("id", supplierId)
      .single();

    if (fetchErr || !supplier) {
      return new Response(JSON.stringify({ error: "Supplier integration not found" }), { status: 404, headers: corsHeaders });
    }

    const creds = decryptCredentials(supplier.credentials_encrypted);
    const endpoints = supplier.endpoints_config;
    const authType = supplier.auth_type;

    // Helper to build headers & auto-refresh OAuth token
    const prepareHeaders = async () => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (authType === "apikey") {
        if (creds.api_key_header) {
          headers[creds.api_key_header] = creds.api_key;
        } else {
          headers["Authorization"] = `ApiKey ${creds.api_key}`;
        }
      } else if (authType === "bearer") {
        headers["Authorization"] = `Bearer ${creds.access_token}`;
      } else if (authType === "basic") {
        const credentials = btoa(`${creds.username}:${creds.password}`);
        headers["Authorization"] = `Basic ${credentials}`;
      } else if (authType === "oauth2") {
        // OAuth2 check expiry and refresh if needed
        const tokenExpiry = new Date(creds.access_token_expires_at || 0);
        if (tokenExpiry <= new Date()) {
          // Token is expired, trigger refresh
          const refreshUrl = creds.token_refresh_url || `${supplier.api_base_url}/oauth/token`;
          const refreshRes = await fetch(refreshUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              grant_type: "refresh_token",
              refresh_token: creds.refresh_token,
              client_id: creds.client_id,
              client_secret: creds.client_secret,
            }),
          });
          const refreshData = await refreshRes.json();
          if (refreshData.access_token) {
            creds.access_token = refreshData.access_token;
            if (refreshData.refresh_token) creds.refresh_token = refreshData.refresh_token;
            const expiresIn = refreshData.expires_in || 3600;
            creds.access_token_expires_at = new Date(Date.now() + expiresIn * 1000).toISOString();
            
            // Save updated creds to DB
            const reEncrypted = btoa(unescape(encodeURIComponent(JSON.stringify(creds))));
            await supabase
              .from("supplier_integrations")
              .update({ credentials_encrypted: reEncrypted })
              .eq("id", supplierId);
          } else {
            throw new Error("OAuth 2.0 token refresh failed");
          }
        }
        headers["Authorization"] = `Bearer ${creds.access_token}`;
      }
      return headers;
    };

    const startTime = Date.now();

    // 1. Connection Test Action
    if (action === "test-connection") {
      try {
        const headers = await prepareHeaders();
        const testPath = endpoints.connection_test || "/ping";
        const testUrl = testPath.startsWith("http") ? testPath : `${supplier.api_base_url}${testPath}`;
        
        const response = await fetch(testUrl, {
          method: "GET",
          headers,
        });

        const status = response.ok ? "success" : "failed";
        const responseTime = Date.now() - startTime;
        
        // Log to sync logs
        await supabase.from("supplier_sync_logs").insert({
          supplier_id: supplierId,
          action_type: "connection_test",
          status,
          response_time_ms: responseTime,
          message: `Connection test completed with status code ${response.status}`,
          error_details: response.ok ? {} : { statusText: response.statusText },
        });

        return new Response(
          JSON.stringify({
            success: response.ok,
            status: response.status,
            responseTimeMs: responseTime,
          }),
          { status: 200, headers: corsHeaders }
        );
      } catch (err: any) {
        await supabase.from("supplier_sync_logs").insert({
          supplier_id: supplierId,
          action_type: "connection_test",
          status: "failed",
          response_time_ms: Date.now() - startTime,
          message: err?.message || "Connection test connection error",
          error_details: { error: err?.toString() },
        });
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // 2. Product Synchronizer Action
    if (action === "sync-products") {
      try {
        const headers = await prepareHeaders();
        const listPath = endpoints.product_list || "/products";
        const listUrl = listPath.startsWith("http") ? listPath : `${supplier.api_base_url}${listPath}`;

        const response = await fetch(listUrl, {
          method: "GET",
          headers,
        });

        if (!response.ok) {
          throw new Error(`Supplier API returned status ${response.status}`);
        }

        const rawData = await response.json();
        
        // Extract array of items
        const responseRoot = endpoints.response_root_path || "";
        const rawProducts = responseRoot ? getNestedValue(rawData, responseRoot) : rawData;
        
        if (!Array.isArray(rawProducts)) {
          throw new Error(`Products root path does not point to an array. Path: '${responseRoot}'`);
        }

        // 1. Fetch and map categories if configured
        const categoryMap = new Map<string, string>();
        const categoryListPath = endpoints.category_list_path || "";
        if (categoryListPath) {
          try {
            const catUrl = categoryListPath.startsWith("http") ? categoryListPath : `${supplier.api_base_url}${categoryListPath}`;
            const catRes = await fetch(catUrl, { method: "GET", headers });
            if (catRes.ok) {
              const catData = await catRes.json();
              const rawCats = Array.isArray(catData) ? catData : (catData.categories || catData.data || []);
              if (Array.isArray(rawCats)) {
                for (const cat of rawCats) {
                  const catId = String(cat.id || cat.category_id || "");
                  const catName = String(cat.name || cat.title || "");
                  if (catId && catName) {
                    categoryMap.set(catId, catName);
                  }
                }
              }
            }
          } catch (catErr) {
            console.error("Failed to sync supplier categories:", catErr);
          }
        }

        let successCount = 0;
        let skipCount = 0;

        for (const rawProd of rawProducts) {
          const sSku = getNestedValue(rawProd, endpoints.sku_path || "sku");
          if (!sSku) {
            skipCount++;
            continue;
          }

          const sName = getNestedValue(rawProd, endpoints.name_path || "name") || "Supplier Item";
          const sPrice = parseFloat(getNestedValue(rawProd, endpoints.price_path || "price") || "0");
          const sStock = parseInt(getNestedValue(rawProd, endpoints.stock_path || "stock") || "0");
          const sDesc = getNestedValue(rawProd, endpoints.description_path || "description") || "";
          const sWeight = parseFloat(getNestedValue(rawProd, endpoints.weight_path || "weight") || "0");
          const sDim = getNestedValue(rawProd, endpoints.dimensions_path || "dimensions") || "";

          // Resolve Pricing Selling Prices
          const { regular_price, discount_price } = calculatePrice(sPrice, supplier.pricing_rules);

          // Category Resolution
          const sCatId = String(getNestedValue(rawProd, endpoints.category_id_path || "category_id") || "");
          let sCatName = "";
          
          if (sCatId && categoryMap.has(sCatId)) {
            sCatName = categoryMap.get(sCatId) || "";
          } else {
            // Try extracting category name directly from product if it is a string property
            const directCatName = getNestedValue(rawProd, endpoints.category_name_path || "category_name") || getNestedValue(rawProd, "category");
            if (typeof directCatName === "string" && directCatName.trim()) {
              sCatName = directCatName.trim();
            }
          }

          let localCategoryId: string | null = null;
          if (sCatName) {
            const slug = sCatName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
            
            // Query local category by slug
            const { data: existingCat } = await supabase
              .from("categories")
              .select("id")
              .eq("slug", slug)
              .maybeSingle();

            if (existingCat) {
              localCategoryId = existingCat.id;
            } else {
              // Auto-create category
              const { data: newCat, error: catCreateErr } = await supabase
                .from("categories")
                .insert({
                  name: sCatName,
                  slug: slug,
                  is_active: true,
                  description: `Imported from ${supplier.name}`
                })
                .select("id")
                .single();

              if (!catCreateErr && newCat) {
                localCategoryId = newCat.id;
              }
            }
          }

          const productPayload = {
            name: sName,
            sku: sSku,
            regular_price,
            discount_price,
            stock_quantity: sStock,
            description: sDesc,
            weight: sWeight,
            dimensions: sDim,
            status: "active",
            seller_id: supplier.company_name || supplier.name, // set supplier name as seller info
            category_id: localCategoryId, // set the mapped category ID
          };

          // Upsert product in Database
          const { data: upsertedProduct, error: upsertErr } = await supabase
            .from("products")
            .upsert(productPayload, { onConflict: "sku" })
            .select("id")
            .single();

          if (upsertErr || !upsertedProduct) {
            console.error("Product upsert failed:", upsertErr);
            skipCount++;
            continue;
          }

          // Upsert mapping record
          await supabase.from("supplier_product_mappings").upsert({
            product_id: upsertedProduct.id,
            supplier_id: supplierId,
            supplier_sku: sSku,
            sync_status: "synced",
            last_synced_at: new Date().toISOString(),
          }, { onConflict: "product_id" });

          // Extract and insert image if configured
          const imgUrl = getNestedValue(rawProd, endpoints.image_path || "image");
          if (imgUrl) {
            await supabase.from("product_images").upsert({
              product_id: upsertedProduct.id,
              image_url: imgUrl,
              is_primary: true,
            }, { onConflict: "product_id, image_url" });
          }

          successCount++;
        }

        const responseTime = Date.now() - startTime;
        
        await supabase.from("supplier_sync_logs").insert({
          supplier_id: supplierId,
          action_type: "product_sync",
          status: "success",
          response_time_ms: responseTime,
          message: `Product sync succeeded. Synced: ${successCount}, Skipped: ${skipCount}`,
          error_details: {},
        });

        return new Response(
          JSON.stringify({
            success: true,
            syncedCount: successCount,
            skippedCount: skipCount,
            responseTimeMs: responseTime,
          }),
          { status: 200, headers: corsHeaders }
        );
      } catch (err: any) {
        await supabase.from("supplier_sync_logs").insert({
          supplier_id: supplierId,
          action_type: "product_sync",
          status: "failed",
          response_time_ms: Date.now() - startTime,
          message: `Product sync failed: ${err.message}`,
          error_details: { error: err.toString() },
        });
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // 3. Order Forwarding Action
    if (action === "forward-order") {
      try {
        const { orderId } = payload;
        if (!orderId) {
          throw new Error("Missing orderId in payload");
        }

        // Fetch local order items matching mappings
        const { data: items, error: itemsErr } = await supabase
          .from("order_items")
          .select("id, product_id, quantity, price, products(sku, name)")
          .eq("order_id", orderId);

        if (itemsErr || !items || items.length === 0) {
          throw new Error("Order items not found or empty");
        }

        const headers = await prepareHeaders();
        const orderPath = endpoints.create_order || "/orders";
        const orderUrl = orderPath.startsWith("http") ? orderPath : `${supplier.api_base_url}${orderPath}`;

        let itemsForwarded = 0;

        for (const item of items) {
          // Check if this item is mapped to the current supplier
          const { data: mapping } = await supabase
            .from("supplier_product_mappings")
            .select("*")
            .eq("product_id", item.product_id)
            .eq("supplier_id", supplierId)
            .maybeSingle();

          if (!mapping) continue;

          // Build forward request payload
          const forwardPayload = {
            order_reference: orderId,
            sku: mapping.supplier_sku,
            quantity: item.quantity,
            shipping_address: payload.shipping_address || {},
          };

          const apiResponse = await fetch(orderUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(forwardPayload),
          });

          if (apiResponse.ok) {
            const resData = await apiResponse.json();
            const supplierOrderId = getNestedValue(resData, endpoints.order_id_path || "order_id") || "SUPL-" + Date.now();
            const trackingNum = getNestedValue(resData, endpoints.tracking_path || "tracking_number") || "";

            // Update mapping status
            await supabase
              .from("supplier_product_mappings")
              .update({
                sync_status: "synced",
                last_synced_at: new Date().toISOString(),
              })
              .eq("id", mapping.id);

            // Log successful forwarding
            await supabase.from("supplier_sync_logs").insert({
              supplier_id: supplierId,
              action_type: "order_forward",
              status: "success",
              response_time_ms: Date.now() - startTime,
              message: `Order item ${item.product_id} forwarded successfully. Supplier Order ID: ${supplierOrderId}. Tracking: ${trackingNum}`,
              error_details: { response: resData },
            });

            itemsForwarded++;
          } else {
            const errRes = await apiResponse.text();
            throw new Error(`Supplier API order place failed with status ${apiResponse.status}: ${errRes}`);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            forwardedItemsCount: itemsForwarded,
          }),
          { status: 200, headers: corsHeaders }
        );
      } catch (err: any) {
        await supabase.from("supplier_sync_logs").insert({
          supplier_id: supplierId,
          action_type: "order_forward",
          status: "failed",
          response_time_ms: Date.now() - startTime,
          message: `Order forwarding failed: ${err.message}`,
          error_details: { error: err.toString() },
        });
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    return new Response(JSON.stringify({ error: "Unhandled action" }), { status: 400, headers: corsHeaders });
  } catch (err: any) {
    console.error("Deno execution error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal server error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
