-- Cole no Supabase Dashboard → SQL Editor → Run
-- Cria tabelas teachers / teacher_reviews + storage (idempotente)

CREATE TABLE IF NOT EXISTS public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.teacher_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_reviews_teacher ON public.teacher_reviews(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_reviews_created ON public.teacher_reviews(created_at);

CREATE OR REPLACE FUNCTION public.is_approved_student(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND approval_status = 'approved'
  );
$$;

REVOKE ALL ON FUNCTION public.is_approved_student(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_approved_student(uuid) TO authenticated;

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth read active teachers" ON public.teachers;
DROP POLICY IF EXISTS "Admins manage teachers" ON public.teachers;
DROP POLICY IF EXISTS "Auth read teacher reviews" ON public.teacher_reviews;
DROP POLICY IF EXISTS "Approved students insert own review" ON public.teacher_reviews;
DROP POLICY IF EXISTS "Students update own review" ON public.teacher_reviews;
DROP POLICY IF EXISTS "Admins delete teacher reviews" ON public.teacher_reviews;

CREATE POLICY "Auth read active teachers" ON public.teachers
  FOR SELECT TO authenticated
  USING (is_active OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage teachers" ON public.teachers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Auth read teacher reviews" ON public.teacher_reviews
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Approved students insert own review" ON public.teacher_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_approved_student(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_id AND t.is_active
    )
  );

CREATE POLICY "Students update own review" ON public.teacher_reviews
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins delete teacher reviews" ON public.teacher_reviews
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_teachers_updated ON public.teachers;
CREATE TRIGGER trg_teachers_updated
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_teacher_reviews_updated ON public.teacher_reviews;
CREATE TRIGGER trg_teacher_reviews_updated
  BEFORE UPDATE ON public.teacher_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket + policies
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

-- Recarrega o cache do PostgREST (schema)
NOTIFY pgrst, 'reload schema';
