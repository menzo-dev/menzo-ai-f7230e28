-- Create storage bucket for forum/chat files
INSERT INTO storage.buckets (id, name, public) VALUES ('forum-files', 'forum-files', true) ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for books PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('books', 'books', true) ON CONFLICT (id) DO NOTHING;

-- Create books table
CREATE TABLE IF NOT EXISTS public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  subject text,
  file_url text NOT NULL,
  thumbnail_url text,
  uploaded_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view books" ON public.books FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage books" ON public.books FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Storage policies for forum-files bucket
CREATE POLICY "Authenticated users can upload forum files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'forum-files');
CREATE POLICY "Anyone can view forum files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'forum-files');

-- Storage policies for books bucket  
CREATE POLICY "Authenticated users can view books" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'books');
CREATE POLICY "Admins can upload books" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'books');

-- Add file_url column to forum_posts for file attachments
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS file_name text;