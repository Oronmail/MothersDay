-- Make mobile bucket public so videos can be loaded in browser
UPDATE storage.buckets SET public = true WHERE id = 'mobile';

-- Allow public read access to mobile bucket
CREATE POLICY "Public read access for mobile bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'mobile');
