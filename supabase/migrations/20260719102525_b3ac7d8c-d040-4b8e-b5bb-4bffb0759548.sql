
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Prevent duplicate inventory_alerts per product (so createAlert becomes an upsert-safe path)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_alerts_product_id_unique'
  ) THEN
    ALTER TABLE public.inventory_alerts
      ADD CONSTRAINT inventory_alerts_product_id_unique UNIQUE (product_id);
  END IF;
END $$;
