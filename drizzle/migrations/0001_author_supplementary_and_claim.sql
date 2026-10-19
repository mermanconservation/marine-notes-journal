CREATE OR REPLACE FUNCTION public.add_supplementary_paths(_submission_id uuid, _paths text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.manuscript_submissions
    WHERE id = _submission_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to modify this submission';
  END IF;
  UPDATE public.manuscript_submissions
  SET supplementary_paths = COALESCE(supplementary_paths, '{}') || _paths,
      updated_at = now()
  WHERE id = _submission_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_submissions_by_email()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _email text;
  _count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  IF _email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.manuscript_submissions
  SET user_id = auth.uid(), updated_at = now()
  WHERE user_id IS NULL
    AND lower(corresponding_author_email) = lower(_email);
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_supplementary_paths(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_submissions_by_email() TO authenticated;