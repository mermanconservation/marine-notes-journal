
ALTER TABLE public.manuscript_submissions
  ADD COLUMN IF NOT EXISTS submitted_by_editor boolean NOT NULL DEFAULT false;

ALTER TABLE public.manuscript_submissions
  ADD COLUMN IF NOT EXISTS submitted_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE POLICY "Editors can submit on behalf of authors"
ON public.manuscript_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  AND submitted_by_editor = true
  AND submitted_by_user_id = auth.uid()
  AND status = 'pending'
  AND pipeline_status = 'pending'
  AND pipeline_results IS NULL
  AND decision_date IS NULL
  AND assigned_reviewer_id IS NULL
);
