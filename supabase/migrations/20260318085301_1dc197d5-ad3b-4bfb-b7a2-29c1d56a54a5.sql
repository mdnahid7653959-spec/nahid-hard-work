
-- Fix 1: site_settings - restrict SELECT to admin only, create a public view for non-sensitive keys
DROP POLICY IF EXISTS "Authenticated users can view site settings" ON public.site_settings;
CREATE POLICY "Only admins can view site settings"
ON public.site_settings FOR SELECT TO authenticated
USING (is_admin());

-- Fix 2: cj_settings - restrict to admin only
DROP POLICY IF EXISTS "Authenticated users can read CJ settings" ON public.cj_settings;
CREATE POLICY "Only admins can read CJ settings"
ON public.cj_settings FOR SELECT TO authenticated
USING (is_admin());

-- Fix 3: cj_category_mappings - restrict to admin only
DROP POLICY IF EXISTS "Authenticated users can read CJ category mappings" ON public.cj_category_mappings;
CREATE POLICY "Only admins can read CJ category mappings"
ON public.cj_category_mappings FOR SELECT TO authenticated
USING (is_admin());

-- Fix 4: category_commissions - restrict to admin and approved sellers
DROP POLICY IF EXISTS "Authenticated users can view commissions" ON public.category_commissions;
CREATE POLICY "Admins and sellers can view commissions"
ON public.category_commissions FOR SELECT TO authenticated
USING (is_admin() OR is_seller());
