-- First, create a helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create a helper function to check if user is seller or admin
CREATE OR REPLACE FUNCTION public.is_seller_or_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'seller')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- FIX PRODUCTS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;

CREATE POLICY "Sellers and admins can insert products" 
ON public.products FOR INSERT 
WITH CHECK (public.is_seller_or_admin());

CREATE POLICY "Sellers and admins can update products" 
ON public.products FOR UPDATE 
USING (public.is_seller_or_admin());

CREATE POLICY "Admins can delete products" 
ON public.products FOR DELETE 
USING (public.is_admin());

-- ============================================
-- FIX CATEGORIES TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON public.categories;

CREATE POLICY "Admins can insert categories" 
ON public.categories FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update categories" 
ON public.categories FOR UPDATE 
USING (public.is_admin());

CREATE POLICY "Admins can delete categories" 
ON public.categories FOR DELETE 
USING (public.is_admin());

-- ============================================
-- FIX BRANDS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can manage brands" ON public.brands;

CREATE POLICY "Admins can insert brands" 
ON public.brands FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update brands" 
ON public.brands FOR UPDATE 
USING (public.is_admin());

CREATE POLICY "Admins can delete brands" 
ON public.brands FOR DELETE 
USING (public.is_admin());

-- ============================================
-- FIX COUPONS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can manage coupons" ON public.coupons;

CREATE POLICY "Admins can insert coupons" 
ON public.coupons FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update coupons" 
ON public.coupons FOR UPDATE 
USING (public.is_admin());

CREATE POLICY "Admins can delete coupons" 
ON public.coupons FOR DELETE 
USING (public.is_admin());

-- ============================================
-- FIX SITE_SETTINGS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can manage settings" ON public.site_settings;

CREATE POLICY "Admins can insert settings" 
ON public.site_settings FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update settings" 
ON public.site_settings FOR UPDATE 
USING (public.is_admin());

CREATE POLICY "Admins can delete settings" 
ON public.site_settings FOR DELETE 
USING (public.is_admin());

-- ============================================
-- FIX ORDER_ITEMS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated users can insert order items" ON public.order_items;

-- Users can only view order items from their own orders
CREATE POLICY "Users can view their own order items" 
ON public.order_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  )
  OR public.is_admin()
);

-- Users can only insert order items to their own orders
CREATE POLICY "Users can insert their own order items" 
ON public.order_items FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- ============================================
-- FIX PROFILES TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by owner" ON public.profiles;

-- Users can only view their own profile (and admins can view all)
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (
  user_id = auth.uid() 
  OR public.is_admin()
);

-- ============================================
-- FIX ORDERS TABLE POLICIES (ensure admins can view all)
-- ============================================
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

CREATE POLICY "Users can view their own orders" 
ON public.orders FOR SELECT 
USING (
  user_id = auth.uid() 
  OR public.is_admin()
);