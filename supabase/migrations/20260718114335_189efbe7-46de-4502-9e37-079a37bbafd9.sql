
-- Addresses: add label
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS label TEXT DEFAULT 'Home';

-- CMS banners: add mobile-friendly fields
ALTER TABLE public.cms_banners ADD COLUMN IF NOT EXISTS mobile_image_url TEXT;
ALTER TABLE public.cms_banners ADD COLUMN IF NOT EXISTS image_fit TEXT DEFAULT 'cover';
ALTER TABLE public.cms_banners ADD COLUMN IF NOT EXISTS image_position TEXT DEFAULT 'center';

-- Conversations: buyer & seller (code treats them as buyer/seller chats)
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS buyer_id UUID;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS seller_id UUID;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS product_id UUID;

DROP POLICY IF EXISTS "Users view own convos" ON public.conversations;
DROP POLICY IF EXISTS "Users create own convos" ON public.conversations;
CREATE POLICY "Participants view convos" ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid()=user_id OR auth.uid()=buyer_id OR auth.uid()=seller_id OR is_admin());
CREATE POLICY "Users create convos" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid()=user_id OR auth.uid()=buyer_id);

-- resolve_product_seller helper
CREATE OR REPLACE FUNCTION public.resolve_product_seller(_product_id UUID)
RETURNS TABLE(seller_id UUID, shop_name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.business_name AS shop_name
  FROM public.sellers s
  JOIN public.products p ON p.seller_id = s.user_id
  WHERE p.id = _product_id
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.resolve_product_seller(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_product_seller(UUID) TO authenticated;

-- CJ settings: show_on_homepage
ALTER TABLE public.cj_settings ADD COLUMN IF NOT EXISTS show_on_homepage BOOLEAN DEFAULT true;

-- Layout config: page & sections columns
ALTER TABLE public.layout_config ADD COLUMN IF NOT EXISTS page TEXT DEFAULT 'home';
ALTER TABLE public.layout_config ADD COLUMN IF NOT EXISTS sections JSONB DEFAULT '[]'::jsonb;

-- Recently viewed: view_count
ALTER TABLE public.recently_viewed ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 1;

-- Search history: search_term (rename query)
ALTER TABLE public.search_history ADD COLUMN IF NOT EXISTS search_term TEXT;
UPDATE public.search_history SET search_term = query WHERE search_term IS NULL AND query IS NOT NULL;
ALTER TABLE public.search_history ALTER COLUMN query DROP NOT NULL;

-- Sellers: shop_name
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS shop_name TEXT;
UPDATE public.sellers SET shop_name = business_name WHERE shop_name IS NULL;
ALTER TABLE public.sellers ALTER COLUMN business_name DROP NOT NULL;

-- Push tokens: device_info
ALTER TABLE public.push_tokens ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT '{}'::jsonb;

-- REVOKE execute on all SECURITY DEFINER helpers so linter is happy for public/anon
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_seller_or_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_seller_or_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated;

-- products_public: reissue as SECURITY INVOKER (drop and recreate without security definer)
DROP VIEW IF EXISTS public.products_public;
CREATE VIEW public.products_public
WITH (security_invoker = true) AS
SELECT id, name, slug, short_description, description,
  regular_price, discount_price, category_id, brand_id, seller_id,
  stock_quantity, rating_average, rating_count,
  status, is_featured, is_best_seller, is_new_arrival, is_flash_sale, flash_sale_end,
  tags, view_count, sold_count, created_at
FROM public.products
WHERE status = 'active';
GRANT SELECT ON public.products_public TO anon, authenticated;
