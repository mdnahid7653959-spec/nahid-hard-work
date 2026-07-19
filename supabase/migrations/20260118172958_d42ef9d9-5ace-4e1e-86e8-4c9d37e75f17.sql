-- Create admin_sessions table for server-side session management
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.admin_credentials(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  is_valid BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for faster session lookups
CREATE INDEX idx_admin_sessions_token ON public.admin_sessions(session_token) WHERE is_valid = true;
CREATE INDEX idx_admin_sessions_admin_id ON public.admin_sessions(admin_id);
CREATE INDEX idx_admin_sessions_expires ON public.admin_sessions(expires_at) WHERE is_valid = true;

-- Enable RLS on admin_sessions
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- Block all public access to admin_sessions
CREATE POLICY "No public access to admin sessions" 
ON public.admin_sessions 
AS RESTRICTIVE
FOR ALL 
USING (false);

-- Fix profiles table RLS - Remove overly restrictive policy and use proper user-scoped policies
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;

-- Users can only view their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Admins can view all profiles (for admin panel)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (is_admin());

-- Admins can update profiles
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (is_admin());

-- Function to clean up expired sessions (can be called via cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_admin_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.admin_sessions
  SET is_valid = false
  WHERE expires_at < now() AND is_valid = true;
  
  -- Delete sessions older than 30 days
  DELETE FROM public.admin_sessions
  WHERE created_at < now() - interval '30 days';
END;
$$;

-- Update the default admin password to bcrypt hash
-- New password: MegaMart@Admin#2026! (strong password)
UPDATE public.admin_credentials
SET password_hash = '$2a$12$rK8GfVqVzMjS5XRf5Q5vKuJwL3YQmZR8TL5NPzE4hX7dWVK1vM.Ky'
WHERE username = 'HI Admin';