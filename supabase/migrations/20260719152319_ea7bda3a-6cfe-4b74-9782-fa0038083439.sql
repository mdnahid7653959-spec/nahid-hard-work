GRANT SELECT, INSERT, UPDATE, DELETE ON public.consignments TO authenticated;
GRANT ALL ON public.consignments TO service_role;

DROP POLICY IF EXISTS "Sellers can create own consignments" ON public.consignments;
DROP POLICY IF EXISTS "Sellers can view own consignments" ON public.consignments;
DROP POLICY IF EXISTS "Admins can manage consignments" ON public.consignments;

CREATE POLICY "Sellers can create own consignments"
ON public.consignments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.sellers s
    WHERE s.id = consignments.seller_id
      AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Sellers can view own consignments"
ON public.consignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.sellers s
    WHERE s.id = consignments.seller_id
      AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage consignments"
ON public.consignments
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());