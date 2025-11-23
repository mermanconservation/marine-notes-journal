-- Drop the existing INSERT policy that's blocking submissions
DROP POLICY IF EXISTS "Anyone can submit manuscripts" ON public.manuscript_submissions;

-- Create a new permissive INSERT policy that allows all inserts
CREATE POLICY "Allow public manuscript submissions" 
ON public.manuscript_submissions 
FOR INSERT 
TO public
WITH CHECK (true);