-- Enable realtime for products table
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;

-- Enable realtime for categories table
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;

-- Enable realtime for profiles table
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;