
-- Add user_id to manuscript_submissions for linking to auth users
ALTER TABLE public.manuscript_submissions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add assigned_reviewer column
ALTER TABLE public.manuscript_submissions ADD COLUMN IF NOT EXISTS assigned_reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add decision_date
ALTER TABLE public.manuscript_submissions ADD COLUMN IF NOT EXISTS decision_date timestamp with time zone;

-- Create submission_reviews table for editor notes, revision requests, decisions
CREATE TABLE public.submission_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.manuscript_submissions(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('note', 'request_revision', 'accept', 'reject', 'assign_reviewer')),
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.submission_reviews ENABLE ROW LEVEL SECURITY;

-- Authors can view their own submissions
CREATE POLICY "Authors can view own submissions"
ON public.manuscript_submissions
FOR SELECT
USING (auth.uid() = user_id);

-- Authors can update their own submissions (for revisions)
CREATE POLICY "Authors can update own submissions"
ON public.manuscript_submissions
FOR UPDATE
USING (auth.uid() = user_id);

-- Editors/admins can view all reviews
CREATE POLICY "Editors can view all reviews"
ON public.submission_reviews
FOR SELECT
USING (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin'));

-- Authors can view reviews on their submissions
CREATE POLICY "Authors can view own submission reviews"
ON public.submission_reviews
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.manuscript_submissions ms
    WHERE ms.id = submission_id AND ms.user_id = auth.uid()
  )
);

-- Editors/admins can insert reviews
CREATE POLICY "Editors can insert reviews"
ON public.submission_reviews
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin'));

-- Editors/admins can update submissions (status changes, assignments)
CREATE POLICY "Editors can update all submissions"
ON public.manuscript_submissions
FOR UPDATE
USING (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin'));

-- Authenticated users can insert submissions with their user_id
CREATE POLICY "Authenticated users can submit manuscripts"
ON public.manuscript_submissions
FOR INSERT
WITH CHECK (auth.uid() = user_id);
