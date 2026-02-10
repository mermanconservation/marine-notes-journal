
-- Table for dynamically published articles (by editors)
CREATE TABLE public.articles (
  id SERIAL PRIMARY KEY,
  doi TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  authors TEXT NOT NULL,
  orcid_ids TEXT[] DEFAULT '{}',
  type TEXT NOT NULL,
  publication_date DATE NOT NULL DEFAULT CURRENT_DATE,
  pdf_url TEXT,
  resolver_url TEXT NOT NULL,
  volume TEXT NOT NULL,
  issue TEXT NOT NULL,
  abstract TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Public read access (open access journal)
CREATE POLICY "Articles are publicly readable"
  ON public.articles FOR SELECT
  USING (true);

-- Storage bucket for manuscript PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('manuscripts', 'manuscripts', true);

CREATE POLICY "Manuscripts are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'manuscripts');
