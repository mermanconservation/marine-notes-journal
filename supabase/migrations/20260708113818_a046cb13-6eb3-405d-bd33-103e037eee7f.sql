
ALTER TABLE public.manuscript_submissions
  ADD COLUMN IF NOT EXISTS submitted_by_editor_email TEXT,
  ADD COLUMN IF NOT EXISTS submitted_by_editor_name TEXT;

-- Grant admin role to ctaklis@gmail.com by resolving from auth.users
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'ctaklis@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
