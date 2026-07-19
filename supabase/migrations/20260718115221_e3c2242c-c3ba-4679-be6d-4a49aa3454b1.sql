
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seller_id UUID;
ALTER TABLE public.consignments ADD COLUMN IF NOT EXISTS seller_id UUID;
ALTER TABLE public.seller_payouts ADD COLUMN IF NOT EXISTS transaction_reference TEXT;
