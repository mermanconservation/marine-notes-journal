
-- Create a private bucket for manuscript submissions
INSERT INTO storage.buckets (id, name, public)
VALUES ('manuscript-submissions', 'manuscript-submissions', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Authors can upload own submissions"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'manuscript-submissions'
  AND (storage.foldername(name))[1] = 'submissions'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow authors to read their own files
CREATE POLICY "Authors can read own submissions"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'manuscript-submissions'
  AND (storage.foldername(name))[1] = 'submissions'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow editors/admins to read all submission files
CREATE POLICY "Editors can read all submissions"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'manuscript-submissions'
  AND public.has_role(auth.uid(), 'editor')
);

CREATE POLICY "Admins can read all submissions"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'manuscript-submissions'
  AND public.has_role(auth.uid(), 'admin')
);
