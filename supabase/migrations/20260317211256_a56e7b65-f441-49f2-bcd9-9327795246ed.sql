
-- Buyers can update their conversations (mark as read, update last_message_at)
CREATE POLICY "Buyers can update their conversations"
ON public.conversations FOR UPDATE
TO authenticated
USING (buyer_id = auth.uid())
WITH CHECK (buyer_id = auth.uid());

-- Sellers can update their conversations
CREATE POLICY "Sellers can update their conversations"
ON public.conversations FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.sellers WHERE sellers.id = conversations.seller_id AND sellers.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.sellers WHERE sellers.id = conversations.seller_id AND sellers.user_id = auth.uid()));
