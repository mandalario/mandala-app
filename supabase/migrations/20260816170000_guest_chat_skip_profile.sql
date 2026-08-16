-- Contas de visitante (guest) no chat não devem gerar perfil de aluno.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.is_anonymous, false)
     OR COALESCE(NEW.raw_user_meta_data->>'guest', '') = 'true' THEN
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
