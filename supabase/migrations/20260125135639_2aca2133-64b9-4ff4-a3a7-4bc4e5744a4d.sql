-- Create shipping zones table for delivery areas
CREATE TABLE IF NOT EXISTS public.shipping_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  areas TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shipping rates table for courier prices
CREATE TABLE IF NOT EXISTS public.shipping_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id UUID NOT NULL REFERENCES public.shipping_zones(id) ON DELETE CASCADE,
  courier_name TEXT NOT NULL DEFAULT 'manual',
  base_rate NUMERIC NOT NULL DEFAULT 0,
  per_kg_rate NUMERIC NOT NULL DEFAULT 0,
  cod_charge NUMERIC NOT NULL DEFAULT 0,
  cod_percentage NUMERIC NOT NULL DEFAULT 0,
  estimated_days TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;

-- Anyone can view shipping zones and rates (for checkout)
CREATE POLICY "Anyone can view active shipping zones" 
ON public.shipping_zones 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Anyone can view active shipping rates" 
ON public.shipping_rates 
FOR SELECT 
USING (is_active = true);

-- Admins can manage shipping zones
CREATE POLICY "Admins can manage shipping zones" 
ON public.shipping_zones 
FOR ALL 
USING (is_admin());

-- Admins can manage shipping rates
CREATE POLICY "Admins can manage shipping rates" 
ON public.shipping_rates 
FOR ALL 
USING (is_admin());

-- Insert default shipping zones for Bangladesh
INSERT INTO public.shipping_zones (name, areas, is_active) VALUES
  ('Dhaka City', ARRAY['Dhaka North', 'Dhaka South', 'Gulshan', 'Banani', 'Dhanmondi', 'Mirpur', 'Uttara', 'Mohammadpur'], true),
  ('Dhaka Suburbs', ARRAY['Gazipur', 'Narayanganj', 'Savar', 'Keraniganj', 'Tongi'], true),
  ('Chittagong Division', ARRAY['Chittagong', 'Cox''s Bazar', 'Comilla', 'Rangamati', 'Bandarban', 'Feni'], true),
  ('Outside Dhaka', ARRAY['Rajshahi', 'Khulna', 'Sylhet', 'Barisal', 'Rangpur', 'Mymensingh'], true)
ON CONFLICT DO NOTHING;