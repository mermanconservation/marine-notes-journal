
-- Drop existing author INSERT policy
DROP POLICY IF EXISTS "Authenticated users can submit manuscripts" ON public.manuscript_submissions;

-- Drop existing author UPDATE policy
DROP POLICY IF EXISTS "Authors can update own submissions" ON public.manuscript_submissions;

-- Recreate INSERT: authors can only insert with safe default values
CREATE POLICY "Authenticated users can submit manuscripts"
ON public.manuscript_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND pipeline_status = 'pending'
  AND pipeline_results IS NULL
  AND decision_date IS NULL
  AND assigned_reviewer_id IS NULL
);

-- Recreate UPDATE: authors can update their own submissions but cannot touch editorial fields
CREATE POLICY "Authors can update own submissions"
ON public.manuscript_submissions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND pipeline_status = pipeline_status
  AND pipeline_results IS NULL
  AND decision_date IS NULL
  AND assigned_reviewer_id IS NULL
);
