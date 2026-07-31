-- Create supplier_integrations table
CREATE TABLE IF NOT EXISTS public.supplier_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company_name text,
  api_base_url text NOT NULL,
  api_version text DEFAULT 'v1',
  auth_type text NOT NULL DEFAULT 'apikey', -- 'apikey' | 'bearer' | 'oauth2' | 'basic'
  credentials_encrypted text, -- stores the client-encrypted credentials string
  endpoints_config jsonb NOT NULL DEFAULT '{}'::jsonb, -- maps action/method/path
  pricing_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  sync_interval text NOT NULL DEFAULT '1h', -- '5m' | '15m' | '30m' | '1h' | '6h' | '12h' | '24h'
  is_active boolean NOT NULL DEFAULT true,
  webhook_url text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Create supplier_product_mappings table
CREATE TABLE IF NOT EXISTS public.supplier_product_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.supplier_integrations(id) ON DELETE CASCADE,
  supplier_sku text NOT NULL,
  sync_status text NOT NULL DEFAULT 'synced', -- 'synced' | 'failed' | 'pending'
  last_synced_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Create supplier_sync_logs table
CREATE TABLE IF NOT EXISTS public.supplier_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.supplier_integrations(id) ON DELETE CASCADE,
  action_type text NOT NULL, -- 'connection_test' | 'product_sync' | 'order_forward' | 'webhook'
  status text NOT NULL, -- 'success' | 'failed'
  response_time_ms integer,
  message text,
  error_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.supplier_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_product_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_sync_logs ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies for supplier_integrations
CREATE POLICY "Admins full access on supplier_integrations" ON public.supplier_integrations
  FOR ALL USING (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')))
  WITH CHECK (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')));

-- Add RLS Policies for supplier_product_mappings
CREATE POLICY "Admins full access on supplier_product_mappings" ON public.supplier_product_mappings
  FOR ALL USING (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')))
  WITH CHECK (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')));

-- Add RLS Policies for supplier_sync_logs
CREATE POLICY "Admins full access on supplier_sync_logs" ON public.supplier_sync_logs
  FOR ALL USING (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')))
  WITH CHECK (auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin')));
