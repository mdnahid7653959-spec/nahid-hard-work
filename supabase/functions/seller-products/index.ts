import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get auth token from request
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - No auth token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to verify identity
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid user" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for database operations
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

    // Get profile ID (products.seller_id references profiles.id)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, productId, productData, imageUrls } = await req.json();

    if (action === "create") {
      // Ensure seller_id is set correctly
      const dataToInsert = {
        ...productData,
        seller_id: profile.id,
        status: "inactive", // Products need approval
        approval_status: "pending",
      };

      const { data, error } = await supabase
        .from("products")
        .insert(dataToInsert)
        .select()
        .single();

      if (error) {
        console.error("Create product error:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Insert images if provided
      if (imageUrls && imageUrls.length > 0) {
        const imagesToInsert = imageUrls.map((url: string, index: number) => ({
          product_id: data.id,
          image_url: url,
          is_primary: index === 0,
          sort_order: index,
        }));

        await supabase.from("product_images").insert(imagesToInsert);
      }

      return new Response(
        JSON.stringify({ success: true, product: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update") {
      if (!productId) {
        return new Response(
          JSON.stringify({ error: "Product ID is required for update" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify product belongs to this seller
      const { data: existingProduct, error: checkError } = await supabase
        .from("products")
        .select("seller_id")
        .eq("id", productId)
        .single();

      if (checkError || !existingProduct || existingProduct.seller_id !== profile.id) {
        return new Response(
          JSON.stringify({ error: "Product not found or access denied" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update puts product back to pending approval
      const dataToUpdate = {
        ...productData,
        approval_status: "pending",
        status: "inactive",
      };

      const { data, error } = await supabase
        .from("products")
        .update(dataToUpdate)
        .eq("id", productId)
        .select()
        .single();

      if (error) {
        console.error("Update product error:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update images - delete existing and insert new
      if (imageUrls) {
        await supabase.from("product_images").delete().eq("product_id", productId);
        
        if (imageUrls.length > 0) {
          const imagesToInsert = imageUrls.map((url: string, index: number) => ({
            product_id: productId,
            image_url: url,
            is_primary: index === 0,
            sort_order: index,
          }));

          await supabase.from("product_images").insert(imagesToInsert);
        }
      }

      return new Response(
        JSON.stringify({ success: true, product: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      if (!productId) {
        return new Response(
          JSON.stringify({ error: "Product ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify product belongs to this seller
      const { data: existingProduct, error: checkError } = await supabase
        .from("products")
        .select("seller_id")
        .eq("id", productId)
        .single();

      if (checkError || !existingProduct || existingProduct.seller_id !== profile.id) {
        return new Response(
          JSON.stringify({ error: "Product not found or access denied" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete images first
      await supabase.from("product_images").delete().eq("product_id", productId);

      // Delete product
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) {
        console.error("Delete product error:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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
    console.error("Seller products error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
