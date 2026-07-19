-- Create a storage bucket for product media (images and videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-media', 
  'product-media', 
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view product media
CREATE POLICY "Anyone can view product media" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'product-media');

-- Allow admins to upload product media (using service role in edge function)
CREATE POLICY "Service role can manage product media" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'product-media')
WITH CHECK (bucket_id = 'product-media');