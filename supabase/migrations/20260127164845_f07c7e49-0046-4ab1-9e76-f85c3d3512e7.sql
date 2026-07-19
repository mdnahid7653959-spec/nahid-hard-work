-- Create warehouses table
CREATE TABLE public.warehouses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address JSONB,
  contact_phone TEXT,
  contact_email TEXT,
  is_active BOOLEAN DEFAULT true,
  capacity INTEGER,
  current_stock INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create consignments table
CREATE TABLE public.consignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consignment_number TEXT NOT NULL UNIQUE,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'received', 'rejected')),
  admin_notes TEXT,
  rejection_reason TEXT,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consignments ENABLE ROW LEVEL SECURITY;

-- Warehouse policies
CREATE POLICY "Anyone can view active warehouses" 
ON public.warehouses FOR SELECT 
USING (is_active = true OR is_admin());

CREATE POLICY "Only admins manage warehouses" 
ON public.warehouses FOR ALL 
USING (is_admin());

-- Consignment policies
CREATE POLICY "Sellers can view their own consignments" 
ON public.consignments FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM sellers 
    WHERE sellers.id = consignments.seller_id 
    AND sellers.user_id = auth.uid()
  ) OR is_admin()
);

CREATE POLICY "Sellers can create consignments" 
ON public.consignments FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sellers 
    WHERE sellers.id = consignments.seller_id 
    AND sellers.user_id = auth.uid()
    AND sellers.status = 'approved'
  )
);

CREATE POLICY "Admins can update consignments" 
ON public.consignments FOR UPDATE 
USING (is_admin());

CREATE POLICY "Admins can delete consignments" 
ON public.consignments FOR DELETE 
USING (is_admin());

-- Create function to generate consignment number
CREATE OR REPLACE FUNCTION generate_consignment_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.consignment_number := 'CON-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for consignment number
CREATE TRIGGER set_consignment_number
BEFORE INSERT ON public.consignments
FOR EACH ROW
EXECUTE FUNCTION generate_consignment_number();

-- Create updated_at triggers
CREATE TRIGGER update_warehouses_updated_at
BEFORE UPDATE ON public.warehouses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_consignments_updated_at
BEFORE UPDATE ON public.consignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for consignments
ALTER PUBLICATION supabase_realtime ADD TABLE public.consignments;

-- Insert default warehouses
INSERT INTO public.warehouses (name, address, contact_phone, is_active) VALUES
('Dhaka Main Warehouse', '{"city": "Dhaka", "area": "Uttara", "address": "Sector 10, Road 5"}', '01711111111', true),
('Chittagong Warehouse', '{"city": "Chittagong", "area": "Agrabad", "address": "CDA Avenue"}', '01722222222', true),
('Sylhet Warehouse', '{"city": "Sylhet", "area": "Zindabazar", "address": "Main Road"}', '01733333333', true);