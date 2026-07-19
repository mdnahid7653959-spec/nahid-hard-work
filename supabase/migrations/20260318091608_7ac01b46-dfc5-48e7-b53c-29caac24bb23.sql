-- Allow anyone (including anonymous visitors) to view active, approved products
CREATE POLICY "Anyone can view active products"
ON public.products FOR SELECT TO public
USING (status = 'active' AND (approval_status = 'approved' OR approval_status IS NULL));