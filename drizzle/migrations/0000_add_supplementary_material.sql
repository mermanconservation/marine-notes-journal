ALTER TABLE public.manuscript_submissions ADD COLUMN IF NOT EXISTS supplementary_paths text[] NOT NULL DEFAULT '{}'::text[];
COMMENT ON COLUMN public.manuscript_submissions.supplementary_paths IS 'Storage paths of supplementary material files uploaded with the submission';

ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS supplementary_files jsonb NOT NULL DEFAULT '[]'::jsonb;
COMMENT ON COLUMN public.articles.supplementary_files IS 'Array of {name, url} objects for published supplementary material files';