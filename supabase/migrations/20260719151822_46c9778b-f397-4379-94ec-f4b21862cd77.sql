DROP POLICY IF EXISTS "Staff view warehouses" ON public.warehouses;
CREATE POLICY "Authenticated view active warehouses"
ON public.warehouses FOR SELECT
TO authenticated
USING (is_active = true OR is_admin());