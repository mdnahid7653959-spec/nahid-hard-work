INSERT INTO public.admin_credentials (username, password_hash, display_name, is_active)
VALUES (
  'HI Admin',
  encode(digest('MegaMart@Admin#2026!', 'sha256'), 'hex'),
  'HI Admin',
  true
)
ON CONFLICT (username) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    is_active = true,
    updated_at = now();