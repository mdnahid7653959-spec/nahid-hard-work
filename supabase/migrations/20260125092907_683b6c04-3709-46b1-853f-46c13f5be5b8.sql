
-- Loyalty Program Tables
CREATE TABLE IF NOT EXISTS public.loyalty_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'expired', 'bonus', 'adjustment')),
  description TEXT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('discount', 'free_shipping', 'product', 'coupon')),
  reward_value JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inventory Alerts
CREATE TABLE IF NOT EXISTS public.inventory_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'overstock')),
  threshold INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Free Delivery Rules
CREATE TABLE IF NOT EXISTS public.free_delivery_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('minimum_order', 'category', 'product', 'location', 'membership')),
  conditions JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Blog Posts for CMS
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT,
  excerpt TEXT,
  featured_image TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMP WITH TIME ZONE,
  meta_title TEXT,
  meta_description TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Admin Roles & Permissions Enhancement
CREATE TABLE IF NOT EXISTS public.admin_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]',
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default admin roles
INSERT INTO public.admin_roles (name, description, permissions, is_system) VALUES
  ('super_admin', 'Full access to all features', '["*"]', true),
  ('product_manager', 'Manage products and inventory', '["products", "inventory", "categories", "brands"]', true),
  ('order_manager', 'Manage orders and shipping', '["orders", "shipping", "returns"]', true),
  ('marketing_manager', 'Manage marketing and promotions', '["coupons", "campaigns", "banners", "loyalty"]', true),
  ('customer_support', 'Handle customer issues', '["users", "reviews", "support_tickets"]', true),
  ('content_manager', 'Manage CMS and content', '["cms", "banners", "blog"]', true),
  ('finance_manager', 'Handle payments and reports', '["reports", "payments", "commissions"]', true)
ON CONFLICT (name) DO NOTHING;

-- Traffic Analytics
CREATE TABLE IF NOT EXISTS public.traffic_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_path TEXT NOT NULL,
  visitor_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  referrer TEXT,
  user_agent TEXT,
  device_type TEXT,
  country TEXT,
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Conversion Events
CREATE TABLE IF NOT EXISTS public.conversion_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'add_to_cart', 'checkout_start', 'purchase', 'signup')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  value DECIMAL(12,2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_delivery_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for loyalty_points
CREATE POLICY "Users can view own loyalty points" ON public.loyalty_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin can manage loyalty points" ON public.loyalty_points FOR ALL USING (is_admin());

-- RLS Policies for loyalty_transactions
CREATE POLICY "Users can view own transactions" ON public.loyalty_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin can manage transactions" ON public.loyalty_transactions FOR ALL USING (is_admin());

-- RLS Policies for loyalty_rewards
CREATE POLICY "Anyone can view active rewards" ON public.loyalty_rewards FOR SELECT USING (is_active = true);
CREATE POLICY "Admin can manage rewards" ON public.loyalty_rewards FOR ALL USING (is_admin());

-- RLS Policies for inventory_alerts
CREATE POLICY "Admin can manage inventory alerts" ON public.inventory_alerts FOR ALL USING (is_admin());

-- RLS Policies for free_delivery_rules
CREATE POLICY "Anyone can view active rules" ON public.free_delivery_rules FOR SELECT USING (is_active = true);
CREATE POLICY "Admin can manage rules" ON public.free_delivery_rules FOR ALL USING (is_admin());

-- RLS Policies for blog_posts
CREATE POLICY "Anyone can view published posts" ON public.blog_posts FOR SELECT USING (status = 'published');
CREATE POLICY "Admin can manage posts" ON public.blog_posts FOR ALL USING (is_admin());

-- RLS Policies for admin_roles
CREATE POLICY "Admin can view roles" ON public.admin_roles FOR SELECT USING (is_admin());
CREATE POLICY "Super admin can manage roles" ON public.admin_roles FOR ALL USING (is_admin());

-- RLS Policies for analytics
CREATE POLICY "Admin can view analytics" ON public.traffic_analytics FOR ALL USING (is_admin());
CREATE POLICY "Admin can view conversions" ON public.conversion_events FOR ALL USING (is_admin());

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_loyalty_points_user ON public.loyalty_points(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user ON public.loyalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_product ON public.inventory_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_traffic_analytics_created ON public.traffic_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_conversion_events_created ON public.conversion_events(created_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts(status);
