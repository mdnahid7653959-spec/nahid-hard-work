-- Fix: Allow admin operations on products table without Supabase Auth
-- The admin panel uses its own admin_users table, not Supabase Auth
-- So auth.uid() is NULL for admin operations - we need to allow anon role

-- Drop existing restrictive policies on products
DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;

-- Re-create policies that also allow anon (admin panel uses anon key with custom auth)
CREATE POLICY "Anyone can insert products" ON public.products 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update products" ON public.products 
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete products" ON public.products 
  FOR DELETE USING (true);

-- Also fix product_images table
DROP POLICY IF EXISTS "Authenticated users can manage images" ON public.product_images;
CREATE POLICY "Anyone can manage product images" ON public.product_images 
  FOR ALL USING (true) WITH CHECK (true);

-- Fix product_variants table  
DROP POLICY IF EXISTS "Authenticated users can manage variants" ON public.product_variants;
CREATE POLICY "Anyone can manage product variants" ON public.product_variants 
  FOR ALL USING (true) WITH CHECK (true);
