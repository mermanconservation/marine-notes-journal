-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create storage bucket for manuscript files
INSERT INTO storage.buckets (id, name, public)
VALUES ('manuscripts', 'manuscripts', false)
ON CONFLICT (id) DO NOTHING;

-- Create table for manuscript submissions
CREATE TABLE public.manuscript_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  manuscript_type TEXT NOT NULL,
  abstract TEXT NOT NULL,
  keywords TEXT NOT NULL,
  corresponding_author_name TEXT NOT NULL,
  corresponding_author_email TEXT NOT NULL,
  corresponding_author_affiliation TEXT NOT NULL,
  corresponding_author_orcid TEXT,
  all_authors TEXT NOT NULL,
  cover_letter TEXT,
  copyright_agreed BOOLEAN NOT NULL DEFAULT false,
  file_paths TEXT[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.manuscript_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert submissions (public form)
CREATE POLICY "Anyone can submit manuscripts"
ON public.manuscript_submissions
FOR INSERT
WITH CHECK (true);

-- Only authenticated users (editors) can view submissions
CREATE POLICY "Editors can view all submissions"
ON public.manuscript_submissions
FOR SELECT
USING (auth.role() = 'authenticated');

-- Storage policies for manuscript files
CREATE POLICY "Anyone can upload manuscript files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'manuscripts');

CREATE POLICY "Authenticated users can view manuscript files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'manuscripts' AND auth.role() = 'authenticated');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_manuscript_submissions_updated_at
BEFORE UPDATE ON public.manuscript_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();