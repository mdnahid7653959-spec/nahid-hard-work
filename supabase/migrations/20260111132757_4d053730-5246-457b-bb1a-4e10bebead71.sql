-- Add color and video_url columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS color VARCHAR(50),
ADD COLUMN IF NOT EXISTS video_url TEXT;