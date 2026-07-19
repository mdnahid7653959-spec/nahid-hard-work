
-- Sellers extras
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending';
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS shop_slug TEXT;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS shop_description TEXT;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS shop_banner TEXT;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS warehouse_address TEXT;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS return_address TEXT;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS bank_branch TEXT;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS bank_account_name TEXT;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS mobile_banking_provider TEXT;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS mobile_banking_number TEXT;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS total_products INTEGER DEFAULT 0;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;

-- Products additional aliases (already have regular_price/discount_price/sold_count)
-- Nothing needed there.

-- Orders: tracking
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_name TEXT;

-- Seller earnings: gross/commission
ALTER TABLE public.seller_earnings ADD COLUMN IF NOT EXISTS gross_amount NUMERIC DEFAULT 0;
ALTER TABLE public.seller_earnings ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE public.seller_earnings ADD COLUMN IF NOT EXISTS commission_amount NUMERIC DEFAULT 0;

-- Seller payouts: net/commission/period
ALTER TABLE public.seller_payouts ADD COLUMN IF NOT EXISTS net_amount NUMERIC DEFAULT 0;
ALTER TABLE public.seller_payouts ADD COLUMN IF NOT EXISTS commission_deducted NUMERIC DEFAULT 0;
ALTER TABLE public.seller_payouts ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.seller_payouts ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE public.seller_payouts ADD COLUMN IF NOT EXISTS period_end DATE;

-- Free delivery rules
ALTER TABLE public.free_delivery_rules ADD COLUMN IF NOT EXISTS rule_type TEXT DEFAULT 'min_order';
ALTER TABLE public.free_delivery_rules ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.free_delivery_rules ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
ALTER TABLE public.free_delivery_rules ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE public.free_delivery_rules ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;

-- Inventory alerts
ALTER TABLE public.inventory_alerts ADD COLUMN IF NOT EXISTS alert_type TEXT DEFAULT 'low_stock';

-- Loyalty rewards: points_required alias, name
ALTER TABLE public.loyalty_rewards ADD COLUMN IF NOT EXISTS points_required INTEGER DEFAULT 0;
UPDATE public.loyalty_rewards SET points_required = points_cost WHERE points_required = 0 AND points_cost IS NOT NULL;

-- Loyalty members: use loyalty_points as rows; add tier/lifetime_points
ALTER TABLE public.loyalty_points ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'bronze';
ALTER TABLE public.loyalty_points ADD COLUMN IF NOT EXISTS lifetime_points INTEGER DEFAULT 0;
ALTER TABLE public.loyalty_points ADD COLUMN IF NOT EXISTS name TEXT;

-- Campaigns: slug, min_order, max_discount
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS min_order_amount NUMERIC DEFAULT 0;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS max_discount_amount NUMERIC;

-- Push notifications: message, image_url, action_url, target_type
ALTER TABLE public.push_notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.push_notifications ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.push_notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE public.push_notifications ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'all';

-- Shipping rates: courier fields
ALTER TABLE public.shipping_rates ADD COLUMN IF NOT EXISTS courier_name TEXT;
ALTER TABLE public.shipping_rates ADD COLUMN IF NOT EXISTS base_rate NUMERIC DEFAULT 0;
ALTER TABLE public.shipping_rates ADD COLUMN IF NOT EXISTS per_kg_rate NUMERIC DEFAULT 0;
ALTER TABLE public.shipping_rates ADD COLUMN IF NOT EXISTS cod_charge NUMERIC DEFAULT 0;
ALTER TABLE public.shipping_rates ADD COLUMN IF NOT EXISTS cod_percentage NUMERIC(5,2) DEFAULT 0;

-- Shipping zones: areas
ALTER TABLE public.shipping_zones ADD COLUMN IF NOT EXISTS areas JSONB DEFAULT '[]'::jsonb;

-- Admin roles: name, description, is_system
ALTER TABLE public.admin_roles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.admin_roles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.admin_roles ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
