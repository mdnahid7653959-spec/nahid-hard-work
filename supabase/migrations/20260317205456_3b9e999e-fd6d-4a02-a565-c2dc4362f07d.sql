CREATE POLICY "Anyone can view seller profile user_id"
ON public.profiles
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.sellers
    WHERE sellers.user_id = profiles.user_id
    AND sellers.status = 'approved'
  )
);