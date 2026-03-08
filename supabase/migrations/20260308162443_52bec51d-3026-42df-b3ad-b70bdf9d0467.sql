
-- Drop all existing RESTRICTIVE policies on manuscript_submissions
DROP POLICY IF EXISTS "Authors can view own submissions" ON public.manuscript_submissions;
DROP POLICY IF EXISTS "Editors can view all submissions" ON public.manuscript_submissions;
DROP POLICY IF EXISTS "Editors can update all submissions" ON public.manuscript_submissions;
DROP POLICY IF EXISTS "Editors can delete submissions" ON public.manuscript_submissions;
DROP POLICY IF EXISTS "Authenticated users can submit manuscripts" ON public.manuscript_submissions;
DROP POLICY IF EXISTS "Authors can update own submissions" ON public.manuscript_submissions;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Authors can view own submissions"
ON public.manuscript_submissions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Editors can view all submissions"
ON public.manuscript_submissions FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can submit manuscripts"
ON public.manuscript_submissions FOR INSERT TO authenticated
WITH CHECK (
  (auth.uid() = user_id)
  AND (status = 'pending'::text)
  AND (pipeline_status = 'pending'::text)
  AND (pipeline_results IS NULL)
  AND (decision_date IS NULL)
  AND (assigned_reviewer_id IS NULL)
);

CREATE POLICY "Authors can update own submissions"
ON public.manuscript_submissions FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  (auth.uid() = user_id)
  AND (status = 'pending'::text)
  AND (pipeline_status = pipeline_status)
  AND (pipeline_results IS NULL)
  AND (decision_date IS NULL)
  AND (assigned_reviewer_id IS NULL)
);

CREATE POLICY "Editors can update all submissions"
ON public.manuscript_submissions FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Editors can delete submissions"
ON public.manuscript_submissions FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Also fix the same issue on other tables that may be RESTRICTIVE
-- submission_reviews
DROP POLICY IF EXISTS "Editors can insert reviews" ON public.submission_reviews;
DROP POLICY IF EXISTS "Editors can delete reviews" ON public.submission_reviews;
DROP POLICY IF EXISTS "Authors can view own submission reviews" ON public.submission_reviews;
DROP POLICY IF EXISTS "Editors can view all reviews" ON public.submission_reviews;

CREATE POLICY "Authors can view own submission reviews"
ON public.submission_reviews FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM manuscript_submissions ms WHERE ms.id = submission_reviews.submission_id AND ms.user_id = auth.uid()));

CREATE POLICY "Editors can view all reviews"
ON public.submission_reviews FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Editors can insert reviews"
ON public.submission_reviews FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Editors can delete reviews"
ON public.submission_reviews FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- unlock_requests
DROP POLICY IF EXISTS "Editors can view unlock requests" ON public.unlock_requests;
DROP POLICY IF EXISTS "Editors can create unlock requests" ON public.unlock_requests;
DROP POLICY IF EXISTS "Admins can update unlock requests" ON public.unlock_requests;
DROP POLICY IF EXISTS "Admins can delete unlock requests" ON public.unlock_requests;

CREATE POLICY "Editors can view unlock requests"
ON public.unlock_requests FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Editors can create unlock requests"
ON public.unlock_requests FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update unlock requests"
ON public.unlock_requests FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete unlock requests"
ON public.unlock_requests FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- editor_notifications
DROP POLICY IF EXISTS "Editors can view notifications" ON public.editor_notifications;
DROP POLICY IF EXISTS "Editors can update notifications" ON public.editor_notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.editor_notifications;
DROP POLICY IF EXISTS "Editors can delete notifications" ON public.editor_notifications;

CREATE POLICY "Editors can view notifications"
ON public.editor_notifications FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Editors can update notifications"
ON public.editor_notifications FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert notifications"
ON public.editor_notifications FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM manuscript_submissions ms WHERE ms.id = editor_notifications.submission_id AND ms.user_id = auth.uid()));

CREATE POLICY "Editors can delete notifications"
ON public.editor_notifications FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- articles (keep restrictive deny policies but make SELECT permissive)
DROP POLICY IF EXISTS "Articles are publicly readable" ON public.articles;
DROP POLICY IF EXISTS "Prevent direct article inserts" ON public.articles;
DROP POLICY IF EXISTS "Prevent direct article updates" ON public.articles;
DROP POLICY IF EXISTS "Prevent direct article deletes" ON public.articles;

CREATE POLICY "Articles are publicly readable"
ON public.articles FOR SELECT
USING (true);

CREATE POLICY "Prevent direct article inserts"
ON public.articles FOR INSERT
WITH CHECK (false);

CREATE POLICY "Prevent direct article updates"
ON public.articles FOR UPDATE
USING (false);

CREATE POLICY "Prevent direct article deletes"
ON public.articles FOR DELETE
USING (false);
