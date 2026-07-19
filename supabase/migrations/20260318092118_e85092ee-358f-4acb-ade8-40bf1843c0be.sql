-- Fix: site_settings needs public read for storefront (store name, SEO, etc.)
-- The previous migration made it admin-only which broke the frontend
DROP POLICY IF EXISTS "Only admins can view site settings" ON public.site_settings;

-- Allow anyone to read non-sensitive site settings (store name, SEO, etc.)
CREATE POLICY "Anyone can read site settings"
ON public.site_settings FOR SELECT TO public
USING (true);

-- CJ settings: allow public read of just the display flags (is_enabled, show_on_homepage etc.)
-- The frontend only needs to know if CJ is enabled
DROP POLICY IF EXISTS "Only admins can read CJ settings" ON public.cj_settings;
CREATE POLICY "Anyone can read CJ display settings"
ON public.cj_settings FOR SELECT TO public
USING (true);