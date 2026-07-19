import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Verify admin session
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const contentType = req.headers.get("content-type") || "";
    
    // Handle FormData (file upload)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const action = formData.get("action") as string;
      const adminId = formData.get("adminId") as string;

      // Verify admin
      const isValidAdmin = await verifyAdminSession(supabase, adminId);
      if (!isValidAdmin) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "upload") {
        const file = formData.get("file") as File;
        
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
        const filename = `banners/${timestamp}-${randomStr}.${ext}`;

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

        // Bucket is private (workspace policy blocks public buckets); create long-lived signed URL
        const { data: signed, error: signErr } = await supabase.storage
          .from("product-media")
          .createSignedUrl(filename, 60 * 60 * 24 * 365 * 10); // 10 years

        if (signErr) {
          console.error("Sign URL error:", signErr);
          return new Response(
            JSON.stringify({ error: signErr.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, url: signed.signedUrl, path: filename }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    
    // Handle JSON requests
    const body = await req.json();
    const { action, adminId, bannerId, bannerData } = body;

    // Verify admin
    const isValidAdmin = await verifyAdminSession(supabase, adminId);
    if (!isValidAdmin) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "create") {
      const { data, error } = await supabase
        .from("cms_banners")
        .insert({
          title: bannerData.title,
          image_url: bannerData.image_url,
          mobile_image_url: bannerData.mobile_image_url || null,
          link_url: bannerData.link_url || null,
          position: bannerData.position || "hero",
          sort_order: bannerData.sort_order || 0,
          is_active: bannerData.is_active ?? true,
          starts_at: bannerData.starts_at || null,
          ends_at: bannerData.ends_at || null,
          image_fit: bannerData.image_fit || "cover",
          image_position: bannerData.image_position || "center",
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update") {
      const { data, error } = await supabase
        .from("cms_banners")
        .update({
          ...bannerData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bannerId)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      // Get banner to delete associated file
      const { data: banner } = await supabase
        .from("cms_banners")
        .select("image_url")
        .eq("id", bannerId)
        .single();

      // Delete from database
      const { error } = await supabase
        .from("cms_banners")
        .delete()
        .eq("id", bannerId);

      if (error) throw error;

      // Try to delete from storage if it's our file
      if (banner?.image_url?.includes("product-media")) {
        const path = banner.image_url.split("/product-media/")[1];
        if (path) {
          await supabase.storage.from("product-media").remove([path]);
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "toggle") {
      const { data, error } = await supabase
        .from("cms_banners")
        .update({ is_active: bannerData.is_active, updated_at: new Date().toISOString() })
        .eq("id", bannerId)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Admin banners error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
