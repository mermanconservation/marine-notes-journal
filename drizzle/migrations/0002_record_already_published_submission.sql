CREATE OR REPLACE FUNCTION public.mark_submission_already_published(_submission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _status text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;
  SELECT status INTO _status FROM public.manuscript_submissions WHERE id = _submission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF _status <> 'accepted' THEN RAISE EXCEPTION 'Only accepted submissions can be marked as already published'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.submission_reviews WHERE submission_id = _submission_id AND action = 'note' AND comment = 'Publication recorded: already published.') THEN
    INSERT INTO public.submission_reviews (submission_id, reviewer_id, action, comment)
    VALUES (_submission_id, auth.uid(), 'note', 'Publication recorded: already published.');
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_submission_already_published(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_submission_already_published(uuid) TO authenticated;
COMMENT ON FUNCTION public.mark_submission_already_published(uuid) IS 'Admin-only idempotent publication acknowledgement; preserves acceptance and records a dated reviewer audit note without creating an article or sending email.';