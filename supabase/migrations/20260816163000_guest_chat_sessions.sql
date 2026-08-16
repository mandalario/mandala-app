-- Visitantes no chat de suporte usam auth anônima; não criar perfil de aluno.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.is_anonymous, false) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, approval_status, profile_completed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'pending',
    false
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');

  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.guest_chat_sessions (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.guest_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guest read own session"
  ON public.guest_chat_sessions FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Guest insert own session"
  ON public.guest_chat_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Guest update own session"
  ON public.guest_chat_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins read guest sessions"
  ON public.guest_chat_sessions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
