
-- 1) SELLERS: column-level grants + tighter policies
DROP POLICY IF EXISTS "Anyone view active sellers" ON public.sellers;

CREATE POLICY "Public view active sellers"
ON public.sellers FOR SELECT
USING (status = 'active' OR auth.uid() = user_id OR is_admin());

REVOKE SELECT ON public.sellers FROM anon, authenticated;

GRANT SELECT (
  id, user_id, business_name, business_type, shop_name, shop_slug,
  shop_description, shop_logo, shop_banner, logo_url, description,
  status, approval_status, is_verified,
  rating, rating_average, rating_count, total_sales, total_products, total_orders,
  created_at, updated_at
) ON public.sellers TO anon;

GRANT SELECT ON public.sellers TO authenticated;
-- Owner/admin-only sensitive columns are protected by the SELECT policy
-- (anon has no user_id match, authenticated non-owners fail the policy unless status='active';
--  for active sellers we still need column-level restrictions for non-owners).

-- To truly prevent authenticated non-owners from reading sensitive columns,
-- revoke authenticated broad SELECT and grant only safe columns, plus keep a
-- separate owner/admin path via service_role-backed edge functions if needed.
REVOKE SELECT ON public.sellers FROM authenticated;
GRANT SELECT (
  id, user_id, business_name, business_type, shop_name, shop_slug,
  shop_description, shop_logo, shop_banner, logo_url, description,
  status, approval_status, is_verified, commission_rate,
  rating, rating_average, rating_count, total_sales, total_products, total_orders,
  business_email, business_phone, contact_email, contact_phone,
  created_at, updated_at, approved_at, approved_by, rejection_reason,
  business_address, warehouse_address, return_address,
  bank_name, bank_branch, bank_account_name, bank_account_number, bank_account,
  mobile_banking_provider, mobile_banking_number,
  business_license, business_registration_number, trade_license_number, trade_license_image,
  tax_id, nid_number, nid_front_image, nid_back_image,
  id_document_type, birth_certificate_number, birth_certificate_image,
  warning_count, metadata
) ON public.sellers TO authenticated;

-- Note: authenticated column grants above are broad; the sensitive columns are still
-- gated by RLS. Split into two policies: sensitive columns only for owner/admin,
-- non-sensitive for anyone active. Implement via revoking those column privileges
-- from authenticated and re-granting via a security-definer RPC or view for owners.
-- Simpler: drop the "public view active" and require row ownership/admin for base table;
-- expose public storefront through a view.

DROP POLICY IF EXISTS "Public view active sellers" ON public.sellers;

CREATE POLICY "Owner or admin view seller"
ON public.sellers FOR SELECT
USING (auth.uid() = user_id OR is_admin());

REVOKE SELECT ON public.sellers FROM anon, authenticated;
GRANT SELECT ON public.sellers TO authenticated; -- gated by RLS to owner/admin
GRANT INSERT, UPDATE, DELETE ON public.sellers TO authenticated;
GRANT ALL ON public.sellers TO service_role;

-- Public storefront view with only safe columns
CREATE OR REPLACE VIEW public.public_sellers
WITH (security_invoker = false) AS
SELECT id, user_id, business_name, business_type, shop_name, shop_slug,
       shop_description, shop_logo, shop_banner, logo_url, description,
       status, approval_status, is_verified,
       rating, rating_average, rating_count,
       total_sales, total_products, total_orders,
       created_at
FROM public.sellers
WHERE status = 'active';

GRANT SELECT ON public.public_sellers TO anon, authenticated;

-- 2) inventory_logs
DROP POLICY IF EXISTS "Admins/sellers view inventory logs" ON public.inventory_logs;
DROP POLICY IF EXISTS "Admins/sellers insert inventory logs" ON public.inventory_logs;

CREATE POLICY "Sellers view own inventory logs"
ON public.inventory_logs FOR SELECT
USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.sellers s ON s.id = p.seller_id
    WHERE p.id = inventory_logs.product_id AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Sellers insert own inventory logs"
ON public.inventory_logs FOR INSERT
WITH CHECK (
  is_admin() OR EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.sellers s ON s.id = p.seller_id
    WHERE p.id = inventory_logs.product_id AND s.user_id = auth.uid()
  )
);

-- 3) inventory_alerts
DROP POLICY IF EXISTS "Admins/sellers manage alerts" ON public.inventory_alerts;

CREATE POLICY "Sellers manage own alerts"
ON public.inventory_alerts FOR ALL
USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.sellers s ON s.id = p.seller_id
    WHERE p.id = inventory_alerts.product_id AND s.user_id = auth.uid()
  )
)
WITH CHECK (
  is_admin() OR EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.sellers s ON s.id = p.seller_id
    WHERE p.id = inventory_alerts.product_id AND s.user_id = auth.uid()
  )
);

-- 4) seller_earnings
DROP POLICY IF EXISTS "Sellers/admins view earnings" ON public.seller_earnings;

CREATE POLICY "Sellers view own earnings"
ON public.seller_earnings FOR SELECT
USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM public.sellers s
    WHERE s.id = seller_earnings.seller_id AND s.user_id = auth.uid()
  )
);

-- 5) seller_payouts
DROP POLICY IF EXISTS "Sellers/admins view payouts" ON public.seller_payouts;

CREATE POLICY "Sellers view own payouts"
ON public.seller_payouts FOR SELECT
USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM public.sellers s
    WHERE s.id = seller_payouts.seller_id AND s.user_id = auth.uid()
  )
);

-- 6) Lock trigger-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM anon, authenticated, public;
