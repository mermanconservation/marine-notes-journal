
-- Remove the old overly permissive public insert policy
DROP POLICY IF EXISTS "Allow public manuscript submissions" ON public.manuscript_submissions;
