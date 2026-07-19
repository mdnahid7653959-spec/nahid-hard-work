
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT, user_agent TEXT,
  is_valid BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_sessions TO service_role;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_admin_sessions" ON public.admin_sessions FOR ALL USING (false);

CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID, action TEXT NOT NULL, entity_type TEXT, entity_id UUID,
  details JSONB DEFAULT '{}'::jsonb, ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_activity_logs TO authenticated;
GRANT ALL ON public.admin_activity_logs TO service_role;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view activity logs" ON public.admin_activity_logs FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admins insert activity logs" ON public.admin_activity_logs FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID, role TEXT NOT NULL DEFAULT 'admin',
  permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_roles TO authenticated;
GRANT ALL ON public.admin_roles TO service_role;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view roles" ON public.admin_roles FOR SELECT TO authenticated USING (is_admin());

DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin','moderator','seller','customer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, full_name TEXT NOT NULL, phone TEXT,
  address_line1 TEXT NOT NULL, address_line2 TEXT, city TEXT NOT NULL,
  state TEXT, postal_code TEXT, country TEXT NOT NULL DEFAULT 'BD',
  is_default BOOLEAN NOT NULL DEFAULT false, address_type TEXT DEFAULT 'shipping',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own addresses" ON public.addresses FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Admins view addresses" ON public.addresses FOR SELECT TO authenticated USING (is_admin());

CREATE TABLE IF NOT EXISTS public.sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE, business_name TEXT NOT NULL,
  business_email TEXT, business_phone TEXT, business_address TEXT,
  business_license TEXT, tax_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  commission_rate NUMERIC(5,2) DEFAULT 10.00,
  bank_account JSONB DEFAULT '{}'::jsonb, logo_url TEXT, description TEXT,
  is_verified BOOLEAN DEFAULT false, rating NUMERIC(3,2) DEFAULT 0,
  total_sales NUMERIC(12,2) DEFAULT 0, metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sellers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sellers TO authenticated;
GRANT ALL ON public.sellers TO service_role;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view active sellers" ON public.sellers FOR SELECT USING (status='active' OR auth.uid()=user_id OR is_admin());
CREATE POLICY "Users create own seller" ON public.sellers FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Users update own seller" ON public.sellers FOR UPDATE TO authenticated USING (auth.uid()=user_id OR is_admin());
CREATE POLICY "Admins delete sellers" ON public.sellers FOR DELETE TO authenticated USING (is_admin());

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, payment_method TEXT NOT NULL,
  payment_provider TEXT, transaction_id TEXT, provider_reference TEXT,
  amount NUMERIC NOT NULL, currency TEXT NOT NULL DEFAULT 'BDT',
  status TEXT NOT NULL DEFAULT 'pending', provider_status TEXT,
  provider_response JSONB, paid_at TIMESTAMPTZ, failed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ, refund_amount NUMERIC, refund_reason TEXT,
  metadata JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own payments" ON public.payments FOR SELECT TO authenticated USING (auth.uid()=user_id OR is_admin());
CREATE POLICY "Users create own payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Admins manage payments" ON public.payments FOR ALL TO authenticated USING (is_admin());

CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID, order_id UUID, change_type TEXT NOT NULL,
  quantity_change INTEGER NOT NULL, previous_quantity INTEGER NOT NULL DEFAULT 0,
  new_quantity INTEGER NOT NULL DEFAULT 0, notes TEXT, created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.inventory_logs TO authenticated;
GRANT ALL ON public.inventory_logs TO service_role;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins/sellers view inventory logs" ON public.inventory_logs FOR SELECT TO authenticated USING (is_seller_or_admin());
CREATE POLICY "Admins/sellers insert inventory logs" ON public.inventory_logs FOR INSERT TO authenticated WITH CHECK (is_seller_or_admin());

CREATE TABLE IF NOT EXISTS public.inventory_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  threshold INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  triggered_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_alerts TO authenticated;
GRANT ALL ON public.inventory_alerts TO service_role;
ALTER TABLE public.inventory_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins/sellers manage alerts" ON public.inventory_alerts FOR ALL TO authenticated USING (is_seller_or_admin()) WITH CHECK (is_seller_or_admin());

CREATE TABLE IF NOT EXISTS public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, address TEXT, city TEXT, country TEXT DEFAULT 'BD',
  contact_phone TEXT, is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.warehouses TO authenticated;
GRANT ALL ON public.warehouses TO service_role;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage warehouses" ON public.warehouses FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Staff view warehouses" ON public.warehouses FOR SELECT TO authenticated USING (is_seller_or_admin());

CREATE TABLE IF NOT EXISTS public.shipping_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, regions TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shipping_zones TO anon, authenticated;
GRANT ALL ON public.shipping_zones TO service_role;
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view zones" ON public.shipping_zones FOR SELECT USING (is_active);
CREATE POLICY "Admins manage zones" ON public.shipping_zones FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.shipping_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES public.shipping_zones(id) ON DELETE CASCADE,
  name TEXT NOT NULL, price NUMERIC NOT NULL DEFAULT 0,
  min_weight NUMERIC DEFAULT 0, max_weight NUMERIC, min_order_total NUMERIC,
  estimated_days INTEGER, is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shipping_rates TO anon, authenticated;
GRANT ALL ON public.shipping_rates TO service_role;
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view rates" ON public.shipping_rates FOR SELECT USING (is_active);
CREATE POLICY "Admins manage rates" ON public.shipping_rates FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.free_delivery_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, min_order_amount NUMERIC NOT NULL DEFAULT 0,
  zone_id UUID, is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.free_delivery_rules TO anon, authenticated;
GRANT ALL ON public.free_delivery_rules TO service_role;
ALTER TABLE public.free_delivery_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view rules" ON public.free_delivery_rules FOR SELECT USING (is_active);
CREATE POLICY "Admins manage rules" ON public.free_delivery_rules FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.consignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  tracking_number TEXT, courier TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  shipped_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.consignments TO authenticated;
GRANT ALL ON public.consignments TO service_role;
ALTER TABLE public.consignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins/sellers manage consignments" ON public.consignments FOR ALL TO authenticated USING (is_seller_or_admin()) WITH CHECK (is_seller_or_admin());

CREATE TABLE IF NOT EXISTS public.seller_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE,
  order_id UUID, amount NUMERIC NOT NULL DEFAULT 0,
  commission NUMERIC NOT NULL DEFAULT 0, net_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seller_earnings TO authenticated;
GRANT ALL ON public.seller_earnings TO service_role;
ALTER TABLE public.seller_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers/admins view earnings" ON public.seller_earnings FOR SELECT TO authenticated USING (is_seller_or_admin());

CREATE TABLE IF NOT EXISTS public.seller_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
  payout_method TEXT, reference TEXT, processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seller_payouts TO authenticated;
GRANT ALL ON public.seller_payouts TO service_role;
ALTER TABLE public.seller_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers/admins view payouts" ON public.seller_payouts FOR SELECT TO authenticated USING (is_seller_or_admin());
CREATE POLICY "Admins manage payouts" ON public.seller_payouts FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.category_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.category_commissions TO authenticated;
GRANT ALL ON public.category_commissions TO service_role;
ALTER TABLE public.category_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view commissions" ON public.category_commissions FOR SELECT USING (true);
CREATE POLICY "Admins manage commissions" ON public.category_commissions FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.cms_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT, subtitle TEXT, image_url TEXT, link_url TEXT,
  position TEXT DEFAULT 'home', sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cms_banners TO anon, authenticated;
GRANT ALL ON public.cms_banners TO service_role;
ALTER TABLE public.cms_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view banners" ON public.cms_banners FOR SELECT USING (is_active);
CREATE POLICY "Admins manage banners" ON public.cms_banners FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.cms_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, content TEXT,
  meta_title TEXT, meta_description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cms_pages TO anon, authenticated;
GRANT ALL ON public.cms_pages TO service_role;
ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view published pages" ON public.cms_pages FOR SELECT USING (is_published);
CREATE POLICY "Admins manage pages" ON public.cms_pages FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, excerpt TEXT, content TEXT,
  cover_image TEXT, author_id UUID,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ, tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_posts TO anon, authenticated;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view published posts" ON public.blog_posts FOR SELECT USING (is_published);
CREATE POLICY "Admins manage posts" ON public.blog_posts FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.custom_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, section_type TEXT DEFAULT 'products',
  config JSONB DEFAULT '{}'::jsonb, sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.custom_sections TO anon, authenticated;
GRANT ALL ON public.custom_sections TO service_role;
ALTER TABLE public.custom_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view sections" ON public.custom_sections FOR SELECT USING (is_active);
CREATE POLICY "Admins manage sections" ON public.custom_sections FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.layout_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type TEXT NOT NULL DEFAULT 'home',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.layout_config TO anon, authenticated;
GRANT ALL ON public.layout_config TO service_role;
ALTER TABLE public.layout_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view layout" ON public.layout_config FOR SELECT USING (is_active);
CREATE POLICY "Admins manage layout" ON public.layout_config FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.site_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL, value JSONB, description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_config TO anon, authenticated;
GRANT ALL ON public.site_config TO service_role;
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view site config" ON public.site_config FOR SELECT USING (true);
CREATE POLICY "Admins manage site config" ON public.site_config FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.theme_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.theme_config TO anon, authenticated;
GRANT ALL ON public.theme_config TO service_role;
ALTER TABLE public.theme_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view theme" ON public.theme_config FOR SELECT USING (true);
CREATE POLICY "Admins manage theme" ON public.theme_config FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.theme_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id UUID REFERENCES public.theme_config(id) ON DELETE CASCADE,
  version TEXT NOT NULL, config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.theme_versions TO authenticated;
GRANT ALL ON public.theme_versions TO service_role;
ALTER TABLE public.theme_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage theme versions" ON public.theme_versions FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, description TEXT,
  campaign_type TEXT DEFAULT 'flash_sale',
  starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ,
  discount_type TEXT DEFAULT 'percentage', discount_value NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  banner_image TEXT, metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.campaigns TO anon, authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view active campaigns" ON public.campaigns FOR SELECT USING (is_active);
CREATE POLICY "Admins manage campaigns" ON public.campaigns FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, points INTEGER NOT NULL DEFAULT 0,
  transaction_type TEXT DEFAULT 'earned', reference_id UUID,
  description TEXT, expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.loyalty_points TO authenticated;
GRANT ALL ON public.loyalty_points TO service_role;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own points" ON public.loyalty_points FOR SELECT TO authenticated USING (auth.uid()=user_id OR is_admin());

CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, description TEXT, points_cost INTEGER NOT NULL,
  reward_type TEXT DEFAULT 'discount', reward_value NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.loyalty_rewards TO anon, authenticated;
GRANT ALL ON public.loyalty_rewards TO service_role;
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view rewards" ON public.loyalty_rewards FOR SELECT USING (is_active);
CREATE POLICY "Admins manage rewards" ON public.loyalty_rewards FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.user_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, code TEXT NOT NULL,
  discount_type TEXT DEFAULT 'percentage', discount_value NUMERIC NOT NULL DEFAULT 0,
  is_used BOOLEAN NOT NULL DEFAULT false, used_at TIMESTAMPTZ, expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_vouchers TO authenticated;
GRANT ALL ON public.user_vouchers TO service_role;
ALTER TABLE public.user_vouchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own vouchers" ON public.user_vouchers FOR SELECT TO authenticated USING (auth.uid()=user_id OR is_admin());
CREATE POLICY "Admins manage vouchers" ON public.user_vouchers FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, amount NUMERIC NOT NULL,
  transaction_type TEXT DEFAULT 'credit', balance_after NUMERIC,
  reference_id UUID, description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own wallet" ON public.wallet_transactions FOR SELECT TO authenticated USING (auth.uid()=user_id OR is_admin());

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, subject TEXT, status TEXT DEFAULT 'open',
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own convos" ON public.conversations FOR SELECT TO authenticated USING (auth.uid()=user_id OR is_admin());
CREATE POLICY "Users create own convos" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Admins manage convos" ON public.conversations FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID, content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view messages in own convos" ON public.messages FOR SELECT TO authenticated USING (
  conversation_id IN (SELECT id FROM public.conversations WHERE user_id = auth.uid()) OR is_admin()
);
CREATE POLICY "Users insert own messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id=auth.uid() OR is_admin());

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, title TEXT NOT NULL, message TEXT,
  notification_type TEXT DEFAULT 'info', link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "Admins manage notifications" ON public.notifications FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, token TEXT NOT NULL,
  platform TEXT DEFAULT 'web', is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_tokens TO authenticated;
GRANT ALL ON public.push_tokens TO service_role;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tokens" ON public.push_tokens FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

CREATE TABLE IF NOT EXISTS public.push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL, body TEXT,
  target_audience TEXT DEFAULT 'all',
  target_users UUID[] DEFAULT ARRAY[]::UUID[],
  data JSONB DEFAULT '{}'::jsonb,
  scheduled_at TIMESTAMPTZ, sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft', created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.push_notifications TO authenticated;
GRANT ALL ON public.push_notifications TO service_role;
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage push notifs" ON public.push_notifications FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.recently_viewed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recently_viewed TO authenticated;
GRANT ALL ON public.recently_viewed TO service_role;
ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own history" ON public.recently_viewed FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, query TEXT NOT NULL,
  results_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.search_history TO authenticated;
GRANT ALL ON public.search_history TO service_role;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own searches" ON public.search_history FOR SELECT TO authenticated USING (auth.uid()=user_id OR is_admin());
CREATE POLICY "Users log searches" ON public.search_history FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id OR user_id IS NULL);

CREATE TABLE IF NOT EXISTS public.cj_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  default_margin_type TEXT NOT NULL DEFAULT 'percentage',
  default_margin_value NUMERIC(10,2) NOT NULL DEFAULT 30.00,
  usd_to_bdt_rate NUMERIC(10,2) NOT NULL DEFAULT 120.00,
  show_in_search BOOLEAN NOT NULL DEFAULT true,
  show_in_categories BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cj_settings TO anon, authenticated;
GRANT ALL ON public.cj_settings TO service_role;
ALTER TABLE public.cj_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone read cj settings" ON public.cj_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage cj settings" ON public.cj_settings FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
INSERT INTO public.cj_settings (is_enabled) VALUES (true) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.cj_category_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cj_category_name TEXT NOT NULL UNIQUE,
  local_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  custom_margin_type TEXT, custom_margin_value NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cj_category_mappings TO anon, authenticated;
GRANT ALL ON public.cj_category_mappings TO service_role;
ALTER TABLE public.cj_category_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone read cj mappings" ON public.cj_category_mappings FOR SELECT USING (true);
CREATE POLICY "Admins manage cj mappings" ON public.cj_category_mappings FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.cj_api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token TEXT NOT NULL,
  access_token_expires_at TIMESTAMPTZ NOT NULL,
  refresh_token TEXT NOT NULL,
  refresh_token_expires_at TIMESTAMPTZ NOT NULL,
  last_auth_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.cj_api_tokens TO service_role;
ALTER TABLE public.cj_api_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_cj_tokens" ON public.cj_api_tokens FOR ALL USING (false) WITH CHECK (false);

CREATE OR REPLACE VIEW public.products_public AS
SELECT id, name, slug, short_description, description,
  regular_price, discount_price, category_id, brand_id, seller_id,
  stock_quantity, rating_average, rating_count,
  status, is_featured, is_best_seller, is_new_arrival, is_flash_sale, flash_sale_end,
  tags, view_count, sold_count, created_at
FROM public.products
WHERE status = 'active';
GRANT SELECT ON public.products_public TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();
