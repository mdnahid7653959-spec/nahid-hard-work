-- Fix: Allow admin operations on supplier integration tables without Supabase Auth
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins full access on supplier_integrations" ON public.supplier_integrations;
DROP POLICY IF EXISTS "Admins full access on supplier_product_mappings" ON public.supplier_product_mappings;
DROP POLICY IF EXISTS "Admins full access on supplier_sync_logs" ON public.supplier_sync_logs;

-- Re-create policies that allow anon access (since admin panel uses anon client)
CREATE POLICY "Anyone can manage supplier_integrations" ON public.supplier_integrations
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can manage supplier_product_mappings" ON public.supplier_product_mappings
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can manage supplier_sync_logs" ON public.supplier_sync_logs
  FOR ALL USING (true) WITH CHECK (true);
