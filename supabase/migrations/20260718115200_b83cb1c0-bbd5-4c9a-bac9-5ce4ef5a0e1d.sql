
ALTER TABLE public.shipping_zones DROP COLUMN IF EXISTS areas;
ALTER TABLE public.shipping_zones ADD COLUMN areas TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE public.shipping_rates ALTER COLUMN estimated_days TYPE TEXT USING estimated_days::TEXT;

ALTER TABLE public.loyalty_rewards ALTER COLUMN reward_value DROP DEFAULT;
ALTER TABLE public.loyalty_rewards ALTER COLUMN reward_value TYPE JSONB USING to_jsonb(reward_value);
ALTER TABLE public.loyalty_rewards ALTER COLUMN reward_value SET DEFAULT '{}'::jsonb;

ALTER TABLE public.push_notifications ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0;
ALTER TABLE public.push_notifications ADD COLUMN IF NOT EXISTS failed_count INTEGER DEFAULT 0;
ALTER TABLE public.push_notifications ADD COLUMN IF NOT EXISTS sent_by UUID;
