-- =============================================
-- MULTI-VENDOR E-COMMERCE PLATFORM SCHEMA
-- Phase 1: Core Tables for Sellers & Shipping
-- =============================================

-- 1. SELLER VERIFICATION STATUS ENUM
CREATE TYPE public.seller_status AS ENUM ('pending', 'approved', 'rejected', 'suspended', 'banned');

-- 2. SELLERS TABLE (Vendor Registration & Profile)
CREATE TABLE public.sellers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_name TEXT NOT NULL,
  shop_slug TEXT NOT NULL UNIQUE,
  shop_logo TEXT,
  shop_banner TEXT,
  shop_description TEXT,
  business_name TEXT,
  business_type TEXT, -- individual, company, partnership
  business_registration_number TEXT,
  tax_id TEXT,
  bank_name TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_branch TEXT,
  mobile_banking_provider TEXT, -- bKash, Nagad, Rocket
  mobile_banking_number TEXT,
  contact_phone TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  warehouse_address JSONB,
  return_address JSONB,
  nid_number TEXT,
  nid_front_image TEXT,
  nid_back_image TEXT,
  trade_license_number TEXT,
  trade_license_image TEXT,
  status seller_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  warning_count INTEGER DEFAULT 0,
  rating_average NUMERIC(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  total_products INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_sales NUMERIC(12,2) DEFAULT 0,
  commission_rate NUMERIC(5,2), -- Override category commission if set
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sellers
CREATE POLICY "Anyone can view approved sellers" ON public.sellers
  FOR SELECT USING (status = 'approved' OR user_id = auth.uid() OR is_admin());

CREATE POLICY "Users can create their seller profile" ON public.sellers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sellers can update their own profile" ON public.sellers
  FOR UPDATE USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Only admins can delete sellers" ON public.sellers
  FOR DELETE USING (is_admin());

-- 3. CATEGORY COMMISSIONS TABLE
CREATE TABLE public.category_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10.00, -- Percentage
  effective_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  effective_to TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_id)
);

ALTER TABLE public.category_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view commissions" ON public.category_commissions
  FOR SELECT USING (true);

CREATE POLICY "Only admins manage commissions" ON public.category_commissions
  FOR ALL USING (is_admin());

-- 4. SHIPPING ZONES TABLE
CREATE TABLE public.shipping_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  areas TEXT[] NOT NULL, -- Array of area names/districts
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shipping zones" ON public.shipping_zones
  FOR SELECT USING (is_active = true OR is_admin());

CREATE POLICY "Only admins manage shipping zones" ON public.shipping_zones
  FOR ALL USING (is_admin());

-- 5. SHIPPING RATES TABLE
CREATE TABLE public.shipping_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id UUID NOT NULL REFERENCES public.shipping_zones(id) ON DELETE CASCADE,
  courier_name TEXT NOT NULL, -- pathao, redx, steadfast, manual
  base_rate NUMERIC(10,2) NOT NULL,
  per_kg_rate NUMERIC(10,2) DEFAULT 0,
  cod_charge NUMERIC(10,2) DEFAULT 0,
  cod_percentage NUMERIC(5,2) DEFAULT 0,
  estimated_days TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shipping rates" ON public.shipping_rates
  FOR SELECT USING (is_active = true OR is_admin());

CREATE POLICY "Only admins manage shipping rates" ON public.shipping_rates
  FOR ALL USING (is_admin());

-- 6. SELLER PAYOUTS TABLE
CREATE TABLE public.seller_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  commission_deducted NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(12,2) NOT NULL,
  payment_method TEXT NOT NULL, -- bank_transfer, bkash, nagad, rocket
  payment_details JSONB,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID,
  transaction_reference TEXT,
  notes TEXT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view their payouts" ON public.seller_payouts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.sellers WHERE id = seller_payouts.seller_id AND user_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "Only admins manage payouts" ON public.seller_payouts
  FOR ALL USING (is_admin());

-- 7. SELLER EARNINGS TABLE (Per Order)
CREATE TABLE public.seller_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id UUID,
  product_id UUID,
  gross_amount NUMERIC(12,2) NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL,
  commission_amount NUMERIC(12,2) NOT NULL,
  net_amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, paid, refunded
  payout_id UUID REFERENCES public.seller_payouts(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view their earnings" ON public.seller_earnings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.sellers WHERE id = seller_earnings.seller_id AND user_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "Only system manages earnings" ON public.seller_earnings
  FOR ALL USING (is_admin());

-- 8. ADMIN PERMISSIONS TABLE
CREATE TABLE public.admin_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.admin_credentials(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  can_view BOOLEAN DEFAULT true,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(admin_id, permission_key)
);

ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access to admin permissions" ON public.admin_permissions
  FOR ALL USING (false);

-- 9. ADMIN ACTIVITY LOGS TABLE
CREATE TABLE public.admin_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.admin_credentials(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT, -- product, order, seller, user, etc.
  resource_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access to admin logs" ON public.admin_activity_logs
  FOR ALL USING (false);

-- 10. CMS PAGES TABLE
CREATE TABLE public.cms_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT,
  meta_title TEXT,
  meta_description TEXT,
  is_published BOOLEAN DEFAULT false,
  template TEXT DEFAULT 'default', -- default, landing, blog
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published pages" ON public.cms_pages
  FOR SELECT USING (is_published = true OR is_admin());

CREATE POLICY "Only admins manage pages" ON public.cms_pages
  FOR ALL USING (is_admin());

-- 11. CMS BANNERS TABLE
CREATE TABLE public.cms_banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  mobile_image_url TEXT,
  link_url TEXT,
  position TEXT NOT NULL DEFAULT 'homepage_slider', -- homepage_slider, homepage_banner, category_banner, popup
  sort_order INTEGER DEFAULT 0,
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active banners" ON public.cms_banners
  FOR SELECT USING (is_active = true OR is_admin());

CREATE POLICY "Only admins manage banners" ON public.cms_banners
  FOR ALL USING (is_admin());

-- 12. CAMPAIGNS TABLE (Flash Sales, Promotions)
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  banner_image TEXT,
  discount_type TEXT, -- percentage, fixed
  discount_value NUMERIC(10,2),
  min_order_amount NUMERIC(10,2),
  max_discount_amount NUMERIC(10,2),
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  campaign_type TEXT DEFAULT 'flash_sale', -- flash_sale, mega_sale, clearance, seasonal
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active campaigns" ON public.campaigns
  FOR SELECT USING (is_active = true AND starts_at <= now() AND ends_at >= now() OR is_admin());

CREATE POLICY "Only admins manage campaigns" ON public.campaigns
  FOR ALL USING (is_admin());

-- 13. CAMPAIGN PRODUCTS TABLE
CREATE TABLE public.campaign_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  special_price NUMERIC(12,2),
  max_quantity_per_user INTEGER,
  stock_limit INTEGER,
  sold_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, product_id)
);

ALTER TABLE public.campaign_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view campaign products" ON public.campaign_products
  FOR SELECT USING (true);

CREATE POLICY "Only admins manage campaign products" ON public.campaign_products
  FOR ALL USING (is_admin());

-- 14. SUPPORT TICKETS TABLE
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL, -- order, payment, product, refund, seller, other
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  status TEXT DEFAULT 'open', -- open, in_progress, waiting_customer, resolved, closed
  assigned_to UUID REFERENCES public.admin_credentials(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tickets" ON public.support_tickets
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users can create tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins update tickets" ON public.support_tickets
  FOR UPDATE USING (is_admin());

-- 15. TICKET MESSAGES TABLE
CREATE TABLE public.ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID,
  sender_type TEXT NOT NULL, -- user, seller, admin
  message TEXT NOT NULL,
  attachments TEXT[],
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ticket participants can view messages" ON public.ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_messages.ticket_id
      AND (t.user_id = auth.uid() OR is_admin())
    )
    AND (is_internal = false OR is_admin())
  );

CREATE POLICY "Users can add messages to their tickets" ON public.ticket_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_messages.ticket_id
      AND t.user_id = auth.uid()
    )
    OR is_admin()
  );

-- 16. ADD seller_id TO PRODUCTS TABLE
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved'; -- pending, approved, rejected
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS approved_by UUID;

-- 17. ADD courier tracking to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.sellers(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_status TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- 18. UPDATE TRIGGERS
CREATE TRIGGER update_sellers_updated_at
  BEFORE UPDATE ON public.sellers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_category_commissions_updated_at
  BEFORE UPDATE ON public.category_commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shipping_zones_updated_at
  BEFORE UPDATE ON public.shipping_zones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shipping_rates_updated_at
  BEFORE UPDATE ON public.shipping_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_seller_payouts_updated_at
  BEFORE UPDATE ON public.seller_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_seller_earnings_updated_at
  BEFORE UPDATE ON public.seller_earnings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cms_pages_updated_at
  BEFORE UPDATE ON public.cms_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cms_banners_updated_at
  BEFORE UPDATE ON public.cms_banners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 19. Function to check if user is a seller
CREATE OR REPLACE FUNCTION public.is_seller()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.sellers
    WHERE user_id = auth.uid() AND status = 'approved'
  );
END;
$$;

-- 20. Function to get seller id for current user
CREATE OR REPLACE FUNCTION public.get_seller_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seller_uuid uuid;
BEGIN
  SELECT id INTO seller_uuid FROM public.sellers
  WHERE user_id = auth.uid() AND status = 'approved'
  LIMIT 1;
  RETURN seller_uuid;
END;
$$;