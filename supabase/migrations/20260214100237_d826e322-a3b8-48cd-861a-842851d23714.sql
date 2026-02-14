
-- Drop all restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Authors can view own submissions" ON public.manuscript_submissions;
DROP POLICY IF EXISTS "Only editors and admins can view all submissions" ON public.manuscript_submissions;
DROP POLICY IF EXISTS "Authenticated users can submit manuscripts" ON public.manuscript_submissions;
DROP POLICY IF EXISTS "Authors can update own submissions" ON public.manuscript_submissions;
DROP POLICY IF EXISTS "Editors can update all submissions" ON public.manuscript_submissions;

CREATE POLICY "Authors can view own submissions" ON public.manuscript_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Editors can view all submissions" ON public.manuscript_submissions FOR SELECT USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can submit manuscripts" ON public.manuscript_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authors can update own submissions" ON public.manuscript_submissions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Editors can update all submissions" ON public.manuscript_submissions FOR UPDATE USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Fix submission_reviews too
DROP POLICY IF EXISTS "Authors can view own submission reviews" ON public.submission_reviews;
DROP POLICY IF EXISTS "Editors can view all reviews" ON public.submission_reviews;
DROP POLICY IF EXISTS "Editors can insert reviews" ON public.submission_reviews;

CREATE POLICY "Authors can view own submission reviews" ON public.submission_reviews FOR SELECT USING (EXISTS (SELECT 1 FROM manuscript_submissions ms WHERE ms.id = submission_reviews.submission_id AND ms.user_id = auth.uid()));
CREATE POLICY "Editors can view all reviews" ON public.submission_reviews FOR SELECT USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Editors can insert reviews" ON public.submission_reviews FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
