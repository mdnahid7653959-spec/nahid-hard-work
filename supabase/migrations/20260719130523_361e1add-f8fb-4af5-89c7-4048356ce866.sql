
CREATE POLICY "Authenticated can upload to product-media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-media');

CREATE POLICY "Authenticated can update own product-media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-media' AND owner = auth.uid());

CREATE POLICY "Authenticated can delete own product-media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-media' AND owner = auth.uid());
