-- Teachers (instructors) and student reviews

CREATE TABLE public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.teacher_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, user_id)
);

CREATE INDEX idx_teacher_reviews_teacher ON public.teacher_reviews(teacher_id);
CREATE INDEX idx_teacher_reviews_created ON public.teacher_reviews(created_at);

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

CREATE TRIGGER trg_teachers_updated
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_teacher_reviews_updated
  BEFORE UPDATE ON public.teacher_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public)
VALUES ('teachers', 'teachers', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read teachers avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'teachers');

CREATE POLICY "Admins write teachers avatars" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'teachers' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update teachers avatars" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'teachers' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete teachers avatars" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'teachers' AND has_role(auth.uid(), 'admin'));
