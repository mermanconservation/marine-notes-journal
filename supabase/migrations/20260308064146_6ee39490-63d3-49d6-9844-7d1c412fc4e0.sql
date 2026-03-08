
ALTER TABLE public.manuscript_submissions
  ADD COLUMN pipeline_status text NOT NULL DEFAULT 'pending'
    CHECK (pipeline_status IN ('pending', 'running', 'passed', 'failed', 'error')),
  ADD COLUMN pipeline_results jsonb DEFAULT NULL;
