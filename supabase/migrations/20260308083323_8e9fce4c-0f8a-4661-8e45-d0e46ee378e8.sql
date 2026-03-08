
-- Allow editors and admins to delete submissions
CREATE POLICY "Editors can delete submissions"
  ON public.manuscript_submissions FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Allow editors and admins to delete related reviews
CREATE POLICY "Editors can delete reviews"
  ON public.submission_reviews FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Allow editors and admins to delete notifications
CREATE POLICY "Editors can delete notifications"
  ON public.editor_notifications FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Allow editors and admins to delete unlock requests
CREATE POLICY "Admins can delete unlock requests"
  ON public.unlock_requests FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
