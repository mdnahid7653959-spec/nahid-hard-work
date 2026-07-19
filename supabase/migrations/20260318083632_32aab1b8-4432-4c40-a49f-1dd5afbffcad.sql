-- Fix 1: Restrict cj_settings to authenticated users
DROP POLICY IF EXISTS "Anyone can read CJ settings" ON public.cj_settings;
CREATE POLICY "Authenticated users can read CJ settings"
ON public.cj_settings FOR SELECT TO authenticated USING (true);

-- Fix 2: Restrict cj_category_mappings to authenticated users
DROP POLICY IF EXISTS "Anyone can read CJ category mappings" ON public.cj_category_mappings;
CREATE POLICY "Authenticated users can read CJ category mappings"
ON public.cj_category_mappings FOR SELECT TO authenticated USING (true);

-- Fix 3: Restrict category_commissions to authenticated users
DROP POLICY IF EXISTS "Anyone can view commissions" ON public.category_commissions;
CREATE POLICY "Authenticated users can view commissions"
ON public.category_commissions FOR SELECT TO authenticated USING (true);

-- Fix 4: Scope inventory_logs SELECT to own products for sellers
DROP POLICY IF EXISTS "Sellers and admins can view inventory logs" ON public.inventory_logs;
CREATE POLICY "Admins can view all inventory logs"
ON public.inventory_logs FOR SELECT TO authenticated
USING (is_admin());
CREATE POLICY "Sellers can view own product inventory logs"
ON public.inventory_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.sellers s ON s.id = p.seller_id
    WHERE p.id = inventory_logs.product_id AND s.user_id = auth.uid()
  )
);

-- Fix 5: Add WITH CHECK to products UPDATE for sellers to prevent self-approval
DROP POLICY IF EXISTS "Sellers can update own products" ON public.products;
CREATE POLICY "Sellers can update own products"
ON public.products FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sellers s
    WHERE s.id = products.seller_id AND s.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sellers s
    WHERE s.id = products.seller_id AND s.user_id = auth.uid()
  )
  AND (
    approval_status IS NOT DISTINCT FROM (SELECT p.approval_status FROM public.products p WHERE p.id = products.id)
  )
  AND (
    approved_at IS NOT DISTINCT FROM (SELECT p.approved_at FROM public.products p WHERE p.id = products.id)
  )
  AND (
    approved_by IS NOT DISTINCT FROM (SELECT p.approved_by FROM public.products p WHERE p.id = products.id)
  )
);