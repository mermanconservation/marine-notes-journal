
CREATE TABLE IF NOT EXISTS public.journal_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volume text NOT NULL,
  issue text NOT NULL,
  year integer NOT NULL,
  status text NOT NULL DEFAULT 'open',
  issue_pdf_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (volume, issue)
);

GRANT SELECT ON public.journal_issues TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_issues TO authenticated;
GRANT ALL ON public.journal_issues TO service_role;

ALTER TABLE public.journal_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view issues" ON public.journal_issues
  FOR SELECT USING (true);

CREATE POLICY "Admins and editors can insert issues" ON public.journal_issues
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admins and editors can update issues" ON public.journal_issues
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admins can delete issues" ON public.journal_issues
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_journal_issues_updated_at
  BEFORE UPDATE ON public.journal_issues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed current Volume 1, Issue 1 as open
INSERT INTO public.journal_issues (volume, issue, year, status, notes)
VALUES ('1','1',2026,'open','Inaugural issue')
ON CONFLICT (volume, issue) DO NOTHING;
