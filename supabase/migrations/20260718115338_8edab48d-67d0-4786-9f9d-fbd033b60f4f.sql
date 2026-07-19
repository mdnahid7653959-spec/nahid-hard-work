
ALTER TABLE public.sellers 
  ADD COLUMN IF NOT EXISTS business_type TEXT,
  ADD COLUMN IF NOT EXISTS business_registration_number TEXT,
  ADD COLUMN IF NOT EXISTS trade_license_number TEXT,
  ADD COLUMN IF NOT EXISTS trade_license_image TEXT,
  ADD COLUMN IF NOT EXISTS nid_number TEXT,
  ADD COLUMN IF NOT EXISTS nid_front_image TEXT,
  ADD COLUMN IF NOT EXISTS nid_back_image TEXT;

ALTER TABLE public.consignments
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ;
