-- Fix submission_reviews SELECT policies: change from RESTRICTIVE to PERMISSIVE
-- so authors can see AI pipeline reviews on their submissions

DROP POLICY IF EXISTS "Authors can view own submission reviews" ON public.submission_reviews;
DROP POLICY IF EXISTS "Editors can view all reviews" ON public.submission_reviews;

-- Recreate as PERMISSIVE (default) so either condition grants access
CREATE POLICY "Authors can view own submission reviews"
ON public.submission_reviews
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM manuscript_submissions ms
    WHERE ms.id = submission_reviews.submission_id
    AND ms.user_id = auth.uid()
  )
);

CREATE POLICY "Editors can view all reviews"
ON public.submission_reviews
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);