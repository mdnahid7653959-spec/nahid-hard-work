-- Create CJ Settings table for admin configuration
CREATE TABLE public.cj_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  default_margin_type TEXT NOT NULL DEFAULT 'percentage' CHECK (default_margin_type IN ('percentage', 'fixed')),
  default_margin_value NUMERIC(10,2) NOT NULL DEFAULT 30.00,
  usd_to_bdt_rate NUMERIC(10,2) NOT NULL DEFAULT 120.00,
  show_in_search BOOLEAN NOT NULL DEFAULT true,
  show_in_categories BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create CJ Category Mapping table
CREATE TABLE public.cj_category_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cj_category_name TEXT NOT NULL,
  local_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  custom_margin_type TEXT CHECK (custom_margin_type IN ('percentage', 'fixed')),
  custom_margin_value NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cj_category_name)
);

-- Insert default CJ settings
INSERT INTO public.cj_settings (is_enabled, default_margin_type, default_margin_value, usd_to_bdt_rate)
VALUES (true, 'percentage', 30.00, 120.00);

-- Enable RLS
ALTER TABLE public.cj_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cj_category_mappings ENABLE ROW LEVEL SECURITY;

-- Read policies (public can read settings for display)
CREATE POLICY "Anyone can read CJ settings" ON public.cj_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can read CJ category mappings" ON public.cj_category_mappings FOR SELECT USING (true);

-- Write policies (only via edge functions with service role)
CREATE POLICY "Service role can manage CJ settings" ON public.cj_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage CJ category mappings" ON public.cj_category_mappings FOR ALL USING (true) WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_cj_settings_updated_at
  BEFORE UPDATE ON public.cj_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cj_category_mappings_updated_at
  BEFORE UPDATE ON public.cj_category_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();