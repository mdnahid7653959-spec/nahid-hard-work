ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS id_document_type text DEFAULT 'nid',
  ADD COLUMN IF NOT EXISTS birth_certificate_number text,
  ADD COLUMN IF NOT EXISTS birth_certificate_image text;