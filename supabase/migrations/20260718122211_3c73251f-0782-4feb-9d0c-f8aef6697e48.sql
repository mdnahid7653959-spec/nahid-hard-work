
CREATE POLICY "Public read product-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-media');

CREATE POLICY "Service role manages product-media"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'product-media')
WITH CHECK (bucket_id = 'product-media');
