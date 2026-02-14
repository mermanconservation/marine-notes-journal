
-- Deny all direct writes to articles (edge function uses service role key, bypassing RLS)
CREATE POLICY "Prevent direct article inserts"
  ON public.articles FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Prevent direct article updates"
  ON public.articles FOR UPDATE
  USING (false);

CREATE POLICY "Prevent direct article deletes"
  ON public.articles FOR DELETE
  USING (false);
