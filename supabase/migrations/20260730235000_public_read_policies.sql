-- Migration: Enable Public Read Access for Website Visitors (anon role)
-- Ensures products, product_images, site_config, site_settings, categories, brands, and banners
-- are readable by unauthenticated visitors on live deployments (durtup.shop).

-- 1. Products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (true);
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.products TO authenticated;

-- 2. Product Images
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view product images" ON public.product_images;
CREATE POLICY "Anyone can view product images" ON public.product_images FOR SELECT USING (true);
GRANT SELECT ON public.product_images TO anon;
GRANT SELECT ON public.product_images TO authenticated;

-- 3. Product Variants
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view product variants" ON public.product_variants;
CREATE POLICY "Anyone can view product variants" ON public.product_variants FOR SELECT USING (true);
GRANT SELECT ON public.product_variants TO anon;
GRANT SELECT ON public.product_variants TO authenticated;

-- 4. Site Config
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view site config" ON public.site_config;
CREATE POLICY "Anyone can view site config" ON public.site_config FOR SELECT USING (true);
GRANT SELECT ON public.site_config TO anon;
GRANT SELECT ON public.site_config TO authenticated;

-- 5. Site Settings
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;
CREATE POLICY "Anyone can view site settings" ON public.site_settings FOR SELECT USING (true);
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT ON public.site_settings TO authenticated;

-- 6. Categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.categories TO authenticated;

-- 7. Brands
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view brands" ON public.brands;
CREATE POLICY "Anyone can view brands" ON public.brands FOR SELECT USING (true);
GRANT SELECT ON public.brands TO anon;
GRANT SELECT ON public.brands TO authenticated;

-- 8. CMS Banners
ALTER TABLE public.cms_banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view cms banners" ON public.cms_banners;
CREATE POLICY "Anyone can view cms banners" ON public.cms_banners FOR SELECT USING (true);
GRANT SELECT ON public.cms_banners TO anon;
GRANT SELECT ON public.cms_banners TO authenticated;
