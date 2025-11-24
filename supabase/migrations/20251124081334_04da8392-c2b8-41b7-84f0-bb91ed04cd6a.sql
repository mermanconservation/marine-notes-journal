-- First, delete all objects from the manuscripts bucket
DELETE FROM storage.objects WHERE bucket_id = 'manuscripts';

-- Drop storage policies for manuscripts bucket
DROP POLICY IF EXISTS "Anyone can upload manuscript files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view manuscript files" ON storage.objects;

-- Delete the manuscripts bucket
DELETE FROM storage.buckets WHERE id = 'manuscripts';

-- Make file_paths nullable in manuscript_submissions since files won't be stored
ALTER TABLE manuscript_submissions ALTER COLUMN file_paths DROP NOT NULL;
ALTER TABLE manuscript_submissions ALTER COLUMN file_paths SET DEFAULT '{}'::text[];