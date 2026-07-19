-- Allow sellers to view orders assigned to them
CREATE POLICY "Sellers can view their orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sellers
    WHERE sellers.id = orders.seller_id
    AND sellers.user_id = auth.uid()
    AND sellers.status = 'approved'
  )
);

-- Allow sellers to update their orders (for status changes)
CREATE POLICY "Sellers can update their orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sellers
    WHERE sellers.id = orders.seller_id
    AND sellers.user_id = auth.uid()
    AND sellers.status = 'approved'
  )
);

-- Allow sellers to view order items for their orders
CREATE POLICY "Sellers can view order items for their orders"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.sellers s ON s.id = o.seller_id
    WHERE o.id = order_items.order_id
    AND s.user_id = auth.uid()
    AND s.status = 'approved'
  )
);