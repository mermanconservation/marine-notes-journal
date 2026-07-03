
CREATE POLICY "Admins and editors can upload issue pdfs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'issue-pdfs' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor')));

CREATE POLICY "Admins and editors can update issue pdfs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'issue-pdfs' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor')));

CREATE POLICY "Admins and editors can read issue pdfs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'issue-pdfs' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor')));

CREATE POLICY "Admins can delete issue pdfs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'issue-pdfs' AND public.has_role(auth.uid(),'admin'));
