-- Fix function search path
CREATE OR REPLACE FUNCTION generate_consignment_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.consignment_number := 'CON-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;