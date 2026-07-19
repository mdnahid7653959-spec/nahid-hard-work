-- Ensure pgcrypto is available for digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Set admin password to SHA-256 temporarily so first login can succeed, then Edge Function will re-hash to bcrypt.
UPDATE public.admin_credentials
SET password_hash = encode(digest('MegaMart@Admin#2026!', 'sha256'), 'hex'),
    updated_at = now()
WHERE username = 'HI Admin';