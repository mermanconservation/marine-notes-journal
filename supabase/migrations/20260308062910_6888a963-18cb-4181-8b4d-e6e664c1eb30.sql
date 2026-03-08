
CREATE TABLE public.editor_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES public.manuscript_submissions(id) ON DELETE CASCADE,
  title text NOT NULL,
  author_name text NOT NULL,
  author_email text NOT NULL,
  manuscript_type text NOT NULL,
  message text NOT NULL DEFAULT 'New manuscript submitted',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.editor_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors can view notifications"
  ON public.editor_notifications FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can update notifications"
  ON public.editor_notifications FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Service can insert notifications"
  ON public.editor_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);
