
DROP POLICY "Service can insert notifications" ON public.editor_notifications;

CREATE POLICY "Authenticated users can insert notifications"
  ON public.editor_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.manuscript_submissions ms
      WHERE ms.id = editor_notifications.submission_id
        AND ms.user_id = auth.uid()
    )
  );
