-- Ensure teachers storage bucket and policies (idempotent)

INSERT INTO storage.buckets (id, name, public)
VALUES ('teachers', 'teachers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read teachers avatars" ON storage.objects;
DROP POLICY IF EXISTS "Admins write teachers avatars" ON storage.objects;
DROP POLICY IF EXISTS "Admins update teachers avatars" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete teachers avatars" ON storage.objects;

CREATE POLICY "Public read teachers avatars" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'teachers');

CREATE POLICY "Admins write teachers avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'teachers'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "Admins update teachers avatars" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'teachers'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    bucket_id = 'teachers'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "Admins delete teachers avatars" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'teachers'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );
