import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate user via JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - No auth token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid user" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service role client for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is an approved seller
    const { data: seller, error: sellerError } = await supabase
      .from("sellers")
      .select("id, status")
      .eq("user_id", user.id)
      .single();

    if (sellerError || !seller || seller.status !== "approved") {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Not an approved seller" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formData = await req.formData();
    const action = formData.get("action") as string;

    if (action === "upload") {
      const file = formData.get("file") as File;
      const productId = formData.get("productId") as string;
      const mediaType = formData.get("mediaType") as string; // 'image' or 'video'

      if (!file) {
        return new Response(
          JSON.stringify({ error: "No file provided" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If productId provided, verify it belongs to this seller
      if (productId && productId !== "temp") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          const { data: product } = await supabase
            .from("products")
            .select("seller_id")
            .eq("id", productId)
            .single();

          if (product && product.seller_id !== profile.id) {
            return new Response(
              JSON.stringify({ error: "Access denied - Product does not belong to you" }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }

      // Generate unique filename under seller's folder
      const ext = file.name.split(".").pop();
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const filename = `seller-${seller.id}/${productId || "temp"}/${mediaType}/${timestamp}-${randomStr}.${ext}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("product-media")
        .upload(filename, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return new Response(
          JSON.stringify({ error: uploadError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Bucket is private — return signed URL with long expiry
      const { data: signed, error: signErr } = await supabase.storage
        .from("product-media")
        .createSignedUrl(filename, 60 * 60 * 24 * 365 * 10);

      if (signErr) {
        return new Response(
          JSON.stringify({ error: signErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          url: signed.signedUrl,
          path: filename,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      const path = formData.get("path") as string;

      if (!path) {
        return new Response(
          JSON.stringify({ error: "No path provided" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify path belongs to this seller
      if (!path.startsWith(`seller-${seller.id}/`)) {
        return new Response(
          JSON.stringify({ error: "Access denied" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: deleteError } = await supabase.storage
        .from("product-media")
        .remove([path]);

      if (deleteError) {
        console.error("Delete error:", deleteError);
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "save-images") {
      const productId = formData.get("productId") as string;
      const imagesJson = formData.get("images") as string;

      if (!productId || !imagesJson) {
        return new Response(
          JSON.stringify({ error: "Product ID and images are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify product belongs to this seller
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        const { data: product } = await supabase
          .from("products")
          .select("seller_id")
          .eq("id", productId)
          .single();

        if (product && product.seller_id !== profile.id) {
          return new Response(
            JSON.stringify({ error: "Access denied" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const images = JSON.parse(imagesJson);

      // Delete existing images
      await supabase.from("product_images").delete().eq("product_id", productId);

      // Insert new images
      if (images.length > 0) {
        const imageRecords = images.map((img: any, index: number) => ({
          product_id: productId,
          image_url: img.url,
          is_primary: img.isPrimary || false,
          sort_order: index,
          alt_text: `Product image ${index + 1}`,
        }));

        const { error: insertError } = await supabase
          .from("product_images")
          .insert(imageRecords);

        if (insertError) {
          console.error("Insert images error:", insertError);
          return new Response(
            JSON.stringify({ error: insertError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Seller media error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
