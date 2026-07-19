
-- Conversations extras
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS buyer_unread_count INTEGER DEFAULT 0;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS seller_unread_count INTEGER DEFAULT 0;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS seller_name TEXT;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS last_message TEXT;

-- Messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_type TEXT DEFAULT 'buyer';

-- Notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'info';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_url TEXT;

-- Sellers extras
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS shop_logo TEXT;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS rating_average NUMERIC(3,2) DEFAULT 0;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

-- Wallet transactions
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'credit';
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- Blog posts
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS meta_description TEXT;

-- CMS pages
ALTER TABLE public.cms_pages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- Custom sections type alias
ALTER TABLE public.custom_sections ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'products';

-- Consignments - add commonly used fields
ALTER TABLE public.consignments ADD COLUMN IF NOT EXISTS consignment_id TEXT;
ALTER TABLE public.consignments ADD COLUMN IF NOT EXISTS recipient_name TEXT;
ALTER TABLE public.consignments ADD COLUMN IF NOT EXISTS recipient_phone TEXT;
ALTER TABLE public.consignments ADD COLUMN IF NOT EXISTS recipient_address TEXT;
ALTER TABLE public.consignments ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'standard';
ALTER TABLE public.consignments ADD COLUMN IF NOT EXISTS item_description TEXT;
ALTER TABLE public.consignments ADD COLUMN IF NOT EXISTS amount_to_collect NUMERIC DEFAULT 0;

-- resolve_product_seller: rename param to match code call
DROP FUNCTION IF EXISTS public.resolve_product_seller(UUID);
CREATE OR REPLACE FUNCTION public.resolve_product_seller(_product_seller_id UUID)
RETURNS TABLE(seller_id UUID, shop_name TEXT, shop_logo TEXT, is_featured BOOLEAN, rating_average NUMERIC, rating_count INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.shop_name, s.shop_logo, s.is_verified, s.rating_average, s.rating_count
  FROM public.sellers s
  WHERE s.user_id = _product_seller_id
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.resolve_product_seller(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_product_seller(UUID) TO authenticated;
