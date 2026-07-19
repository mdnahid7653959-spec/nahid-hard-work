-- Allow approved sellers to view active warehouses (needed for consignment form)
CREATE POLICY "Approved sellers can view active warehouses"
ON public.warehouses
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.sellers
    WHERE sellers.user_id = auth.uid()
    AND sellers.status = 'approved'
  )
);