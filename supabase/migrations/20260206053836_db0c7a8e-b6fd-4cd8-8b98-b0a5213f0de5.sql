-- =====================================================
-- SECURITY FIX: Block anonymous access and fix permissive policies
-- =====================================================

-- 1. FIX ORDER_ITEMS: Remove overly permissive INSERT policy
DROP POLICY IF EXISTS "Users can insert order items" ON public.order_items;

-- 2. ADD ANONYMOUS BLOCKING POLICIES for sensitive tables

-- Block anonymous access to profiles
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to addresses
CREATE POLICY "Block anonymous access to addresses"
ON public.addresses FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to return_requests
CREATE POLICY "Block anonymous access to return_requests"
ON public.return_requests FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to wallet_transactions  
CREATE POLICY "Block anonymous access to wallet_transactions"
ON public.wallet_transactions FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to seller_earnings
CREATE POLICY "Block anonymous access to seller_earnings"
ON public.seller_earnings FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to seller_payouts
CREATE POLICY "Block anonymous access to seller_payouts"
ON public.seller_payouts FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to notifications
CREATE POLICY "Block anonymous access to notifications"
ON public.notifications FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to conversations
CREATE POLICY "Block anonymous access to conversations"
ON public.conversations FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to messages
CREATE POLICY "Block anonymous access to messages"
ON public.messages FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to loyalty_points
CREATE POLICY "Block anonymous access to loyalty_points"
ON public.loyalty_points FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to push_tokens
CREATE POLICY "Block anonymous access to push_tokens"
ON public.push_tokens FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to recently_viewed
CREATE POLICY "Block anonymous access to recently_viewed"
ON public.recently_viewed FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to support_tickets
CREATE POLICY "Block anonymous access to support_tickets"
ON public.support_tickets FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to order_items
CREATE POLICY "Block anonymous access to order_items"
ON public.order_items FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to sellers (full table, public view is available)
CREATE POLICY "Block anonymous access to sellers"
ON public.sellers FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 3. ADD ADMIN CAN MANAGE RETURN REQUESTS
CREATE POLICY "Admins can manage return requests"
ON public.return_requests FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- 4. ADD ADMIN CAN MANAGE WALLET TRANSACTIONS
CREATE POLICY "Admins can manage wallet transactions"
ON public.wallet_transactions FOR ALL
USING (is_admin())
WITH CHECK (is_admin());