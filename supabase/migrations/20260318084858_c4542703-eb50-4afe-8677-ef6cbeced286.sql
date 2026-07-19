
-- Fix 1: support_tickets INSERT - enforce user_id ownership
DROP POLICY IF EXISTS "Users can create tickets" ON public.support_tickets;
CREATE POLICY "Users can create tickets"
ON public.support_tickets FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Fix 2: Remove broad inventory_logs SELECT policy
DROP POLICY IF EXISTS "Admins and sellers can view inventory logs" ON public.inventory_logs;

-- Fix 3: Remove broad inventory_logs INSERT policy, replace with scoped ones
DROP POLICY IF EXISTS "Admins and sellers can insert inventory logs" ON public.inventory_logs;
CREATE POLICY "Admins can insert inventory logs"
ON public.inventory_logs FOR INSERT TO authenticated
WITH CHECK (is_admin());
CREATE POLICY "Sellers can insert own product inventory logs"
ON public.inventory_logs FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.sellers s ON s.id = p.seller_id
    WHERE p.id = inventory_logs.product_id AND s.user_id = auth.uid()
  )
);
