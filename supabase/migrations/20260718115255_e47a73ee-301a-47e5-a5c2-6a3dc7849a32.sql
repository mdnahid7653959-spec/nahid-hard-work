
ALTER TABLE public.sellers ALTER COLUMN warehouse_address TYPE JSONB USING to_jsonb(warehouse_address);
ALTER TABLE public.sellers ALTER COLUMN return_address TYPE JSONB USING to_jsonb(return_address);
ALTER TABLE public.seller_payouts ADD COLUMN IF NOT EXISTS payment_details JSONB;
ALTER TABLE public.conversations ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.shipping_rates ALTER COLUMN name DROP NOT NULL;
ALTER TABLE public.loyalty_rewards ALTER COLUMN points_cost DROP NOT NULL;
