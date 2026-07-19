-- Fix 1: Restrict site_settings SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;
CREATE POLICY "Authenticated users can view site settings"
ON public.site_settings
FOR SELECT
TO authenticated
USING (true);

-- Fix 2: Remove anonymous search history exposure
DROP POLICY IF EXISTS "Users can view their own search history" ON public.search_history;
CREATE POLICY "Users can view their own search history"
ON public.search_history
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);