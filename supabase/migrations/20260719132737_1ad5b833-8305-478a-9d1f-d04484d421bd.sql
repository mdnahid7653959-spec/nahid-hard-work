-- Track brand creator and allow sellers to add their own brands
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE POLICY "Sellers can create brands"
ON public.brands
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM public.sellers s
    WHERE s.user_id = auth.uid() AND s.status = 'approved'
  )
);

CREATE POLICY "Sellers can update their own brands"
ON public.brands
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);