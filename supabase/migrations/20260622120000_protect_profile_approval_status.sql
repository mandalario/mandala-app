-- Garante que novos alunos iniciem pendentes e que só admins alterem approval_status.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

CREATE OR REPLACE FUNCTION public.protect_profile_approval_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role (auth.uid() nulo) e admins podem alterar approval_status.
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    NEW.approval_status := OLD.approval_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_approval_status_trigger ON public.profiles;

CREATE TRIGGER protect_profile_approval_status_trigger
  BEFORE UPDATE OF approval_status ON public.profiles
  FOR EACH ROW
  WHEN (OLD.approval_status IS DISTINCT FROM NEW.approval_status)
  EXECUTE FUNCTION public.protect_profile_approval_status();

-- Impede aluno de marcar profile_completed=true sem ficha completa.
CREATE OR REPLACE FUNCTION public.validate_profile_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.profile_completed IS DISTINCT FROM TRUE THEN
    RETURN NEW;
  END IF;

  IF NEW.full_name IS NULL OR length(trim(NEW.full_name)) < 2
    OR NEW.phone IS NULL OR NEW.age IS NULL
    OR NEW.weight_kg IS NULL OR NEW.height_cm IS NULL
    OR NEW.emergency_contact_name IS NULL OR NEW.emergency_contact_phone IS NULL
  THEN
    IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'profile_incomplete'
        USING ERRCODE = 'check_violation',
              HINT = 'Preencha todos os campos obrigatórios antes de enviar a ficha.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_profile_completion_trigger ON public.profiles;

CREATE TRIGGER validate_profile_completion_trigger
  BEFORE INSERT OR UPDATE OF profile_completed, full_name, phone, age, weight_kg, height_cm,
    emergency_contact_name, emergency_contact_phone ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_completion();
