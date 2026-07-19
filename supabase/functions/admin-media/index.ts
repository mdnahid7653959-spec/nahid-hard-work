import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Verify admin session by checking if admin exists and is active
async function verifyAdminSession(supabase: any, adminId: string): Promise<boolean> {
  if (!adminId) return false;
  
  const { data: admin, error } = await supabase
    .from("admin_credentials")
    .select("id, is_active")
    .eq("id", adminId)
    .eq("is_active", true)
    .single();
  
  return !error && !!admin;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const formData = await req.formData();
    const action = formData.get("action") as string;
    const adminId = formData.get("adminId") as string;

    // Verify admin session for all actions
    const isValidAdmin = await verifyAdminSession(supabase, adminId);
    if (!isValidAdmin) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid admin session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

      // Generate unique filename
      const ext = file.name.split('.').pop();
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const filename = `${productId || 'temp'}/${mediaType}/${timestamp}-${randomStr}.${ext}`;

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
          path: filename
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

      const images = JSON.parse(imagesJson);

      // Delete existing images for this product
      await supabase
        .from("product_images")
        .delete()
        .eq("product_id", productId);

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
    console.error("Admin media error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
