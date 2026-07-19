-- =====================================================
-- SECURITY FIX: Restrict sensitive data access
-- =====================================================

-- 1. FIX SELLERS TABLE: Create a public view excluding sensitive fields
-- First, drop the overly permissive SELECT policy

DROP POLICY IF EXISTS "Anyone can view approved sellers" ON public.sellers;

-- Create a more restrictive SELECT policy for sellers
-- Only owners and admins can see full details
CREATE POLICY "Sellers can view own profile fully"
ON public.sellers FOR SELECT
USING (
  user_id = auth.uid() OR is_admin()
);

-- Create a public view for basic seller info (excluding sensitive data)
CREATE OR REPLACE VIEW public.sellers_public
WITH (security_invoker = on)
AS SELECT 
  id,
  user_id,
  shop_name,
  shop_slug,
  shop_logo,
  shop_banner,
  shop_description,
  status,
  rating_average,
  rating_count,
  total_products,
  is_featured,
  created_at
FROM public.sellers
WHERE status = 'approved';

-- Grant select on the public view
GRANT SELECT ON public.sellers_public TO anon, authenticated;

-- 2. FIX WAREHOUSES TABLE: Restrict public access
-- Drop the current permissive policy
DROP POLICY IF EXISTS "Anyone can view active warehouses" ON public.warehouses;

-- Only admins can view warehouses (no public access needed)
CREATE POLICY "Only admins can view warehouses"
ON public.warehouses FOR SELECT
USING (is_admin());

-- 3. FIX PRODUCTS TABLE: Create a public view without cost_price
CREATE OR REPLACE VIEW public.products_public
WITH (security_invoker = on)
AS SELECT 
  id,
  name,
  slug,
  description,
  short_description,
  regular_price,
  discount_price,
  discount_type,
  stock_quantity,
  sku,
  category_id,
  brand_id,
  seller_id,
  status,
  is_featured,
  is_best_seller,
  is_new_arrival,
  is_flash_sale,
  flash_sale_end,
  rating_average,
  rating_count,
  sold_count,
  view_count,
  tags,
  color,
  weight,
  dimensions,
  country_of_origin,
  warranty_info,
  return_policy,
  estimated_delivery,
  free_shipping,
  shipping_cost,
  video_url,
  meta_title,
  meta_description,
  meta_keywords,
  min_order_quantity,
  max_order_quantity,
  product_condition,
  reviews_enabled,
  publish_date,
  approval_status,
  created_at,
  updated_at
FROM public.products
WHERE status = 'active' OR status = 'published';

-- Grant select on the public view
GRANT SELECT ON public.products_public TO anon, authenticated;

-- 4. FIX CJ_SETTINGS: Remove overly permissive ALL policy with true check
DROP POLICY IF EXISTS "Service role can manage CJ settings" ON public.cj_settings;

-- Create proper admin-only management policy
CREATE POLICY "Admins can manage CJ settings"
ON public.cj_settings FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- 5. FIX CJ_CATEGORY_MAPPINGS: Remove overly permissive ALL policy
DROP POLICY IF EXISTS "Service role can manage CJ category mappings" ON public.cj_category_mappings;

-- Create proper admin-only management policy
CREATE POLICY "Admins can manage CJ category mappings"
ON public.cj_category_mappings FOR ALL
USING (is_admin())
WITH CHECK (is_admin());