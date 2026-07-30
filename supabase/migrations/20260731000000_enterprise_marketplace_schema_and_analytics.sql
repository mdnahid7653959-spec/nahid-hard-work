-- Migration: 20260731000000_enterprise_marketplace_schema_and_analytics.sql
-- Description: Enterprise Marketplace Schema Expansions, Seller KYC Workflow Fields, Dynamic Analytics RPC Procedures, and Master Admin RLS Hardening policies.

-- ============================================
-- 1. SELLER KYC WORKFLOW FIELDS
-- ============================================
ALTER TABLE public.sellers 
  ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS kyc_rejected_reason TEXT,
  ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kyc_verified_by UUID;

-- ============================================
-- 2. EXPANDED ENTERPRISE MARKETPLACE TABLES
-- ============================================

-- 2.1 Order Timelines
CREATE TABLE IF NOT EXISTS public.order_timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  notes TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_timelines_order_id ON public.order_timelines(order_id);
ALTER TABLE public.order_timelines ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.order_timelines TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_timelines TO authenticated;

-- 2.2 Return Requests
CREATE TABLE IF NOT EXISTS public.return_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  refund_amount NUMERIC(10,2) DEFAULT 0.00,
  images TEXT[] DEFAULT '{}',
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_return_requests_order_id ON public.return_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_user_id ON public.return_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_seller_id ON public.return_requests(seller_id);
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.return_requests TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.return_requests TO authenticated;

-- 2.3 Seller Warnings
CREATE TABLE IF NOT EXISTS public.seller_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  issued_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seller_warnings_seller_id ON public.seller_warnings(seller_id);
ALTER TABLE public.seller_warnings ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.seller_warnings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_warnings TO authenticated;

-- 2.4 Warehouse Stock
CREATE TABLE IF NOT EXISTS public.warehouse_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  rack_location TEXT
);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_warehouse_id ON public.warehouse_stock(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_product_id ON public.warehouse_stock(product_id);
ALTER TABLE public.warehouse_stock ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.warehouse_stock TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.warehouse_stock TO authenticated;

-- 2.5 Stock Transfers
CREATE TABLE IF NOT EXISTS public.stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number TEXT NOT NULL UNIQUE,
  source_warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  dest_warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  received_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_source_wh ON public.stock_transfers(source_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_dest_wh ON public.stock_transfers(dest_warehouse_id);
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.stock_transfers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_transfers TO authenticated;

-- 2.6 Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.suppliers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;

-- 2.7 Purchase Orders
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'draft',
  expected_date TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_warehouse_id ON public.purchase_orders(warehouse_id);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.purchase_orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated;

-- 2.8 Campaign Products
CREATE TABLE IF NOT EXISTS public.campaign_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  special_price NUMERIC(10,2),
  discount_percentage NUMERIC(5,2),
  stock_limit INTEGER,
  sold_count INTEGER NOT NULL DEFAULT 0,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaign_products_campaign_id ON public.campaign_products(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_products_product_id ON public.campaign_products(product_id);
ALTER TABLE public.campaign_products ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.campaign_products TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_products TO authenticated, anon;

-- 2.9 Support Tickets & Ticket Messages
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  assigned_staff_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS ticket_number TEXT;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS assigned_staff_id UUID;
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_staff_id ON public.support_tickets(assigned_staff_id);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.support_tickets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID,
  sender_type TEXT NOT NULL,
  message TEXT NOT NULL,
  attachments TEXT[],
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_sender_id ON public.ticket_messages(sender_id);
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.ticket_messages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_messages TO authenticated;

-- 2.10 Review Moderation Logs
CREATE TABLE IF NOT EXISTS public.review_moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  ai_sentiment TEXT,
  toxicity_score NUMERIC(5,4),
  spam_score NUMERIC(5,4),
  auto_action TEXT,
  flagged_keywords TEXT[] DEFAULT '{}',
  moderated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_review_moderation_logs_review_id ON public.review_moderation_logs(review_id);
ALTER TABLE public.review_moderation_logs ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.review_moderation_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_moderation_logs TO authenticated;

-- 2.11 Platform Wallets
CREATE TABLE IF NOT EXISTS public.platform_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_type TEXT NOT NULL UNIQUE,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  total_credited NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  total_debited NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_platform_wallets_type ON public.platform_wallets(wallet_type);
ALTER TABLE public.platform_wallets ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.platform_wallets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_wallets TO authenticated;

INSERT INTO public.platform_wallets (wallet_type, balance, currency)
VALUES ('main_treasury', 0.00, 'USD')
ON CONFLICT (wallet_type) DO NOTHING;

-- 2.12 Courier Shipments
CREATE TABLE IF NOT EXISTS public.courier_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consignment_id UUID REFERENCES public.consignments(id) ON DELETE CASCADE,
  courier_name TEXT NOT NULL,
  tracking_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  current_location TEXT,
  last_api_sync TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_courier_shipments_consignment_id ON public.courier_shipments(consignment_id);
CREATE INDEX IF NOT EXISTS idx_courier_shipments_tracking_id ON public.courier_shipments(tracking_id);
ALTER TABLE public.courier_shipments ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.courier_shipments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courier_shipments TO authenticated;

-- ============================================
-- 3. MASTER ADMIN RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Admins full access on order_timelines" ON public.order_timelines;
CREATE POLICY "Admins full access on order_timelines" ON public.order_timelines
  FOR ALL USING (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')))
  WITH CHECK (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "Admins full access on return_requests" ON public.return_requests;
CREATE POLICY "Admins full access on return_requests" ON public.return_requests
  FOR ALL USING (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')))
  WITH CHECK (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "Admins full access on seller_warnings" ON public.seller_warnings;
CREATE POLICY "Admins full access on seller_warnings" ON public.seller_warnings
  FOR ALL USING (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')))
  WITH CHECK (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "Admins full access on warehouse_stock" ON public.warehouse_stock;
CREATE POLICY "Admins full access on warehouse_stock" ON public.warehouse_stock
  FOR ALL USING (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')))
  WITH CHECK (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "Admins full access on stock_transfers" ON public.stock_transfers;
CREATE POLICY "Admins full access on stock_transfers" ON public.stock_transfers
  FOR ALL USING (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')))
  WITH CHECK (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "Admins full access on suppliers" ON public.suppliers;
CREATE POLICY "Admins full access on suppliers" ON public.suppliers
  FOR ALL USING (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')))
  WITH CHECK (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "Admins full access on purchase_orders" ON public.purchase_orders;
CREATE POLICY "Admins full access on purchase_orders" ON public.purchase_orders
  FOR ALL USING (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')))
  WITH CHECK (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "Admins full access on campaign_products" ON public.campaign_products;
CREATE POLICY "Admins full access on campaign_products" ON public.campaign_products
  FOR ALL USING (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')))
  WITH CHECK (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "Admins full access on support_tickets" ON public.support_tickets;
CREATE POLICY "Admins full access on support_tickets" ON public.support_tickets
  FOR ALL USING (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')))
  WITH CHECK (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "Admins full access on ticket_messages" ON public.ticket_messages;
CREATE POLICY "Admins full access on ticket_messages" ON public.ticket_messages
  FOR ALL USING (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')))
  WITH CHECK (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "Admins full access on review_moderation_logs" ON public.review_moderation_logs;
CREATE POLICY "Admins full access on review_moderation_logs" ON public.review_moderation_logs
  FOR ALL USING (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')))
  WITH CHECK (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "Admins full access on platform_wallets" ON public.platform_wallets;
CREATE POLICY "Admins full access on platform_wallets" ON public.platform_wallets
  FOR ALL USING (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')))
  WITH CHECK (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "Admins full access on courier_shipments" ON public.courier_shipments;
CREATE POLICY "Admins full access on courier_shipments" ON public.courier_shipments
  FOR ALL USING (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')))
  WITH CHECK (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')));

-- Additional User Policies for end-user accessibility
DROP POLICY IF EXISTS "Users view own return_requests" ON public.return_requests;
CREATE POLICY "Users view own return_requests" ON public.return_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own return_requests" ON public.return_requests;
CREATE POLICY "Users insert own return_requests" ON public.return_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Sellers view own warnings" ON public.seller_warnings;
CREATE POLICY "Sellers view own warnings" ON public.seller_warnings
  FOR SELECT TO authenticated USING (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users view own support_tickets" ON public.support_tickets;
CREATE POLICY "Users view own support_tickets" ON public.support_tickets
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users insert own support_tickets" ON public.support_tickets;
CREATE POLICY "Users insert own support_tickets" ON public.support_tickets
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users view own ticket_messages" ON public.ticket_messages;
CREATE POLICY "Users view own ticket_messages" ON public.ticket_messages
  FOR SELECT TO authenticated USING (sender_id = auth.uid() OR ticket_id IN (SELECT id FROM public.support_tickets WHERE user_id = auth.uid() OR seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid())));

DROP POLICY IF EXISTS "Users insert own ticket_messages" ON public.ticket_messages;
CREATE POLICY "Users insert own ticket_messages" ON public.ticket_messages
  FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());

-- ============================================
-- 4. DYNAMIC ANALYTICS RPC STORED PROCEDURES
-- ============================================

-- 4.1 get_admin_dashboard_revenue_stats()
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_revenue_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT (public.is_admin() OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  SELECT jsonb_build_object(
    'total_revenue', COALESCE(SUM(total), 0),
    'today_revenue', COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE THEN total ELSE 0 END), 0),
    'yesterday_revenue', COALESCE(SUM(CASE WHEN created_at >= (CURRENT_DATE - INTERVAL '1 day') AND created_at < CURRENT_DATE THEN total ELSE 0 END), 0),
    'monthly_revenue', COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN total ELSE 0 END), 0),
    'yearly_revenue', COALESCE(SUM(CASE WHEN created_at >= date_trunc('year', CURRENT_DATE) THEN total ELSE 0 END), 0),
    'gross_revenue', COALESCE(SUM(subtotal), 0),
    'net_revenue', COALESCE(SUM(total - COALESCE(discount_amount, 0)), 0),
    'commission_revenue', COALESCE(SUM(subtotal * 0.10), 0),
    'platform_profit', COALESCE(SUM(subtotal * 0.10 + COALESCE(shipping_cost, 0)), 0)
  ) INTO result
  FROM public.orders
  WHERE status NOT IN ('cancelled', 'refunded');

  RETURN COALESCE(result, jsonb_build_object(
    'total_revenue', 0,
    'today_revenue', 0,
    'yesterday_revenue', 0,
    'monthly_revenue', 0,
    'yearly_revenue', 0,
    'gross_revenue', 0,
    'net_revenue', 0,
    'commission_revenue', 0,
    'platform_profit', 0
  ));
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_admin_dashboard_revenue_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_revenue_stats() TO authenticated, service_role;

-- 4.2 get_admin_dashboard_order_breakdown()
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_order_breakdown()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT (public.is_admin() OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  SELECT jsonb_build_object(
    'pending_count', COALESCE(COUNT(*) FILTER (WHERE status = 'pending'), 0),
    'pending_amount', COALESCE(SUM(total) FILTER (WHERE status = 'pending'), 0),
    'processing_count', COALESCE(COUNT(*) FILTER (WHERE status = 'processing'), 0),
    'processing_amount', COALESCE(SUM(total) FILTER (WHERE status = 'processing'), 0),
    'packed_count', COALESCE(COUNT(*) FILTER (WHERE status = 'packed'), 0),
    'packed_amount', COALESCE(SUM(total) FILTER (WHERE status = 'packed'), 0),
    'shipped_count', COALESCE(COUNT(*) FILTER (WHERE status = 'shipped'), 0),
    'shipped_amount', COALESCE(SUM(total) FILTER (WHERE status = 'shipped'), 0),
    'delivered_count', COALESCE(COUNT(*) FILTER (WHERE status IN ('delivered', 'completed')), 0),
    'delivered_amount', COALESCE(SUM(total) FILTER (WHERE status IN ('delivered', 'completed')), 0),
    'cancelled_count', COALESCE(COUNT(*) FILTER (WHERE status = 'cancelled'), 0),
    'cancelled_amount', COALESCE(SUM(total) FILTER (WHERE status = 'cancelled'), 0),
    'returned_count', COALESCE(COUNT(*) FILTER (WHERE status = 'returned'), 0),
    'returned_amount', COALESCE(SUM(total) FILTER (WHERE status = 'returned'), 0),
    'refunded_count', COALESCE(COUNT(*) FILTER (WHERE status = 'refunded'), 0),
    'refunded_amount', COALESCE(SUM(total) FILTER (WHERE status = 'refunded'), 0),
    'total_orders', COUNT(*)
  ) INTO result
  FROM public.orders;

  RETURN COALESCE(result, jsonb_build_object(
    'pending_count', 0, 'pending_amount', 0,
    'processing_count', 0, 'processing_amount', 0,
    'packed_count', 0, 'packed_amount', 0,
    'shipped_count', 0, 'shipped_amount', 0,
    'delivered_count', 0, 'delivered_amount', 0,
    'cancelled_count', 0, 'cancelled_amount', 0,
    'returned_count', 0, 'returned_amount', 0,
    'refunded_count', 0, 'refunded_amount', 0,
    'total_orders', 0
  ));
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_admin_dashboard_order_breakdown() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_order_breakdown() TO authenticated, service_role;

-- 4.3 get_admin_revenue_timeseries(_period, _start_date, _end_date)
CREATE OR REPLACE FUNCTION public.get_admin_revenue_timeseries(
  _period text DEFAULT 'day',
  _start_date timestamptz DEFAULT NULL,
  _end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  period_date text,
  total_revenue numeric,
  order_count bigint,
  net_revenue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin() OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT
    TO_CHAR(
      date_trunc(
        CASE LOWER(COALESCE(_period, 'day'))
          WHEN 'week' THEN 'week'
          WHEN 'month' THEN 'month'
          WHEN 'year' THEN 'year'
          ELSE 'day'
        END,
        created_at
      ),
      'YYYY-MM-DD'
    ) AS period_date,
    COALESCE(SUM(total), 0)::numeric AS total_revenue,
    COUNT(*)::bigint AS order_count,
    COALESCE(SUM(total - COALESCE(discount_amount, 0)), 0)::numeric AS net_revenue
  FROM public.orders
  WHERE status NOT IN ('cancelled', 'refunded')
    AND (_start_date IS NULL OR created_at >= _start_date)
    AND (_end_date IS NULL OR created_at <= _end_date)
  GROUP BY 1
  ORDER BY 1 ASC;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_admin_revenue_timeseries(text, timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_revenue_timeseries(text, timestamptz, timestamptz) TO authenticated, service_role;

-- 4.4 get_admin_top_products(_limit)
CREATE OR REPLACE FUNCTION public.get_admin_top_products(_limit int DEFAULT 10)
RETURNS TABLE (
  product_id uuid,
  product_name text,
  total_quantity_sold bigint,
  total_revenue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin() OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT
    oi.product_id,
    COALESCE(p.name, oi.product_name, 'Unknown Product') AS product_name,
    COALESCE(SUM(oi.quantity), 0)::bigint AS total_quantity_sold,
    COALESCE(SUM(oi.total), 0)::numeric AS total_revenue
  FROM public.order_items oi
  LEFT JOIN public.products p ON oi.product_id = p.id
  LEFT JOIN public.orders o ON oi.order_id = o.id
  WHERE o.status NOT IN ('cancelled', 'refunded') OR o.status IS NULL
  GROUP BY oi.product_id, p.name, oi.product_name
  ORDER BY total_revenue DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 10), 1), 100);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_admin_top_products(int) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_top_products(int) TO authenticated, service_role;

-- 4.5 get_admin_top_sellers(_limit)
CREATE OR REPLACE FUNCTION public.get_admin_top_sellers(_limit int DEFAULT 10)
RETURNS TABLE (
  seller_id uuid,
  shop_name text,
  business_name text,
  total_sales numeric,
  order_count bigint,
  total_commission numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin() OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT
    s.id AS seller_id,
    COALESCE(s.shop_name, 'Unnamed Shop') AS shop_name,
    COALESCE(s.business_name, 'Unnamed Business') AS business_name,
    COALESCE(SUM(o.total), 0)::numeric AS total_sales,
    COUNT(o.id)::bigint AS order_count,
    COALESCE(SUM(o.subtotal * COALESCE(s.commission_rate, 0.10)), 0)::numeric AS total_commission
  FROM public.sellers s
  LEFT JOIN public.orders o ON s.id = o.seller_id AND o.status NOT IN ('cancelled', 'refunded')
  GROUP BY s.id, s.shop_name, s.business_name
  ORDER BY total_sales DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 10), 1), 100);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_admin_top_sellers(int) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_top_sellers(int) TO authenticated, service_role;

-- 4.6 get_admin_financial_summary()
CREATE OR REPLACE FUNCTION public.get_admin_financial_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT (public.is_admin() OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  SELECT jsonb_build_object(
    'total_payouts', COALESCE((SELECT SUM(amount) FROM public.seller_payouts WHERE status = 'completed'), 0),
    'pending_payouts', COALESCE((SELECT SUM(amount) FROM public.seller_payouts WHERE status = 'pending'), 0),
    'tax_liability', COALESCE((SELECT SUM(tax_amount) FROM public.orders WHERE status NOT IN ('cancelled', 'refunded')), 0),
    'vat_collected', COALESCE((SELECT SUM(tax_amount) FROM public.orders WHERE status NOT IN ('cancelled', 'refunded')), 0),
    'platform_balance', COALESCE((SELECT SUM(balance) FROM public.platform_wallets), 0)
  ) INTO result;

  RETURN result;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_admin_financial_summary() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_financial_summary() TO authenticated, service_role;

-- 4.7 get_admin_inventory_health_stats()
CREATE OR REPLACE FUNCTION public.get_admin_inventory_health_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT (public.is_admin() OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  SELECT jsonb_build_object(
    'low_stock_count', COALESCE((SELECT COUNT(*) FROM public.products WHERE stock > 0 AND stock <= 10 AND status = 'active'), 0),
    'out_of_stock_count', COALESCE((SELECT COUNT(*) FROM public.products WHERE stock <= 0 AND status = 'active'), 0),
    'total_valuation', COALESCE((SELECT SUM(stock * price) FROM public.products WHERE status = 'active'), 0),
    'total_products_tracked', COALESCE((SELECT COUNT(*) FROM public.products), 0)
  ) INTO result;

  RETURN result;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_admin_inventory_health_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_inventory_health_stats() TO authenticated, service_role;

-- 4.8 get_admin_conversion_metrics()
CREATE OR REPLACE FUNCTION public.get_admin_conversion_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _visitors bigint;
  _cart_adds bigint;
  _checkouts bigint;
  _completed bigint;
  _conv_rate numeric;
  _abandon_rate numeric;
  result jsonb;
BEGIN
  IF NOT (public.is_admin() OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  SELECT COALESCE(COUNT(*), 0) INTO _visitors FROM public.profiles;
  SELECT COALESCE(COUNT(*), 0) INTO _cart_adds FROM public.cart_items;
  SELECT COALESCE(COUNT(*), 0) INTO _checkouts FROM public.orders;
  SELECT COALESCE(COUNT(*), 0) INTO _completed FROM public.orders WHERE status NOT IN ('cancelled', 'refunded');
  
  IF _visitors > 0 THEN
    _conv_rate := ROUND((_completed::numeric / _visitors::numeric) * 100, 2);
  ELSE
    _conv_rate := 0;
  END IF;

  IF _checkouts > 0 THEN
    _abandon_rate := ROUND((GREATEST(_checkouts - _completed, 0)::numeric / _checkouts::numeric) * 100, 2);
  ELSE
    _abandon_rate := 0;
  END IF;

  SELECT jsonb_build_object(
    'total_visitors', _visitors,
    'cart_additions', _cart_adds,
    'checkouts_initiated', _checkouts,
    'completed_orders', _completed,
    'conversion_rate', _conv_rate,
    'cart_abandonment_rate', _abandon_rate
  ) INTO result;

  RETURN result;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_admin_conversion_metrics() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_conversion_metrics() TO authenticated, service_role;
