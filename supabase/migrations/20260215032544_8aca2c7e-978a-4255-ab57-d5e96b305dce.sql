
-- Create unlock_requests table for editors to request unlocks that admins approve
CREATE TABLE public.unlock_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.manuscript_submissions(id),
  requested_by uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  decided_by uuid,
  decision_comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  decided_at timestamp with time zone
);

ALTER TABLE public.unlock_requests ENABLE ROW LEVEL SECURITY;

-- Editors and admins can view all unlock requests
CREATE POLICY "Editors can view unlock requests"
ON public.unlock_requests FOR SELECT
USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Editors and admins can create unlock requests
CREATE POLICY "Editors can create unlock requests"
ON public.unlock_requests FOR INSERT
WITH CHECK (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update (approve/deny) unlock requests
CREATE POLICY "Admins can update unlock requests"
ON public.unlock_requests FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));
