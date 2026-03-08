
-- Deny direct uploads to manuscripts bucket
CREATE POLICY "Deny direct manuscript uploads"
  ON storage.objects FOR INSERT
  TO authenticated, anon
  WITH CHECK (bucket_id != 'manuscripts');

-- Deny direct updates to manuscripts bucket
CREATE POLICY "Deny direct manuscript updates"
  ON storage.objects FOR UPDATE
  TO authenticated, anon
  USING (bucket_id != 'manuscripts');

-- Deny direct deletes from manuscripts bucket
CREATE POLICY "Deny direct manuscript deletes"
  ON storage.objects FOR DELETE
  TO authenticated, anon
  USING (bucket_id != 'manuscripts');
