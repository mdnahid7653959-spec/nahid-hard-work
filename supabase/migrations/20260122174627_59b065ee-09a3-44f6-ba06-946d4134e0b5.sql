-- Create table to store CJ API tokens
CREATE TABLE public.cj_api_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  access_token TEXT NOT NULL,
  access_token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  refresh_token TEXT NOT NULL,
  refresh_token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Only allow one row in this table
CREATE UNIQUE INDEX cj_api_tokens_singleton ON public.cj_api_tokens ((true));

-- Enable RLS but allow edge functions to access via service role
ALTER TABLE public.cj_api_tokens ENABLE ROW LEVEL SECURITY;

-- No public access - only service role can access this table
-- Edge functions use service role key so they can read/write