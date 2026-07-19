-- Create admin_credentials table for dedicated admin login (separate from regular users)
CREATE TABLE IF NOT EXISTS public.admin_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;

-- Only super admins (via edge function) can read admin credentials
-- No public access at all - this is handled via edge function
CREATE POLICY "No public access to admin credentials"
ON public.admin_credentials
FOR ALL
USING (false);

-- Create initial admin user with hashed password
-- Password: hiadmin467265 (bcrypt hashed)
-- Note: In production, this should be changed immediately after first login
INSERT INTO public.admin_credentials (username, password_hash, display_name)
VALUES (
  'HI Admin',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4tHv2LzRZS1cGVOy',
  'HI Admin'
) ON CONFLICT (username) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE public.admin_credentials IS 'Secure admin credentials for dedicated admin portal access';
COMMENT ON COLUMN public.admin_credentials.password_hash IS 'BCrypt hashed password - CHANGE DEFAULT PASSWORD AFTER FIRST LOGIN';