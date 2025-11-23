-- Drop the old restrictive INSERT policy
DROP POLICY IF EXISTS "Anyone can submit manuscripts" ON public.manuscript_submissions;

-- Create a proper permissive INSERT policy that allows public submissions
CREATE POLICY "Anyone can submit manuscripts"
ON public.manuscript_submissions
FOR INSERT
WITH CHECK (true);