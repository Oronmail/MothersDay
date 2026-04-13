-- Create a public storage bucket for videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true);

-- Allow public read access to videos
CREATE POLICY "Public video access"
ON storage.objects
FOR SELECT
USING (bucket_id = 'videos');

-- Allow authenticated users to upload videos (optional, for admin)
CREATE POLICY "Authenticated users can upload videos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'videos');

-- Allow authenticated users to delete videos (optional, for admin)
CREATE POLICY "Authenticated users can delete videos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'videos');