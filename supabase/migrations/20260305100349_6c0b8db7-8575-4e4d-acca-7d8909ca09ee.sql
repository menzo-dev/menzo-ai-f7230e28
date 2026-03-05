
-- Add forum_type column to forum_posts
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS forum_type text DEFAULT 'male';

-- Add video_url column to forum_posts
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS video_url text;

-- Update existing posts' forum_type based on profile gender
UPDATE public.forum_posts fp
SET forum_type = COALESCE(p.gender, 'male')
FROM public.profiles p
WHERE fp.user_id = p.id;

-- Storage policies for avatars bucket (used for forum media too)
DROP POLICY IF EXISTS "Authenticated users can upload to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update own avatars" ON storage.objects;

CREATE POLICY "Authenticated users can upload to avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can update own avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars');
