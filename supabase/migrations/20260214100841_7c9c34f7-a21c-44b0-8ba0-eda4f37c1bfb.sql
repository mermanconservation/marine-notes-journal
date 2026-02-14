
-- Add storage INSERT policy for authenticated users to upload manuscripts
CREATE POLICY "Authenticated users can upload manuscripts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'manuscripts' AND auth.uid()::text = (storage.foldername(name))[2]);
