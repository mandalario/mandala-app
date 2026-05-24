-- Normaliza telefone (WhatsApp) e impede o mesmo número em contas diferentes.

CREATE OR REPLACE FUNCTION public.normalize_phone_digits(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g'), '');
$$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_digits text;

UPDATE public.profiles
SET phone_digits = public.normalize_phone_digits(phone)
WHERE phone IS NOT NULL AND phone_digits IS DISTINCT FROM public.normalize_phone_digits(phone);

CREATE OR REPLACE FUNCTION public.sync_profile_phone_digits()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.phone_digits := public.normalize_phone_digits(NEW.phone);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_phone_digits ON public.profiles;
CREATE TRIGGER profiles_sync_phone_digits
  BEFORE INSERT OR UPDATE OF phone ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_phone_digits();

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_digits_unique
  ON public.profiles (phone_digits)
  WHERE phone_digits IS NOT NULL AND length(phone_digits) >= 10;

CREATE OR REPLACE FUNCTION public.check_phone_available(p_phone text, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE phone_digits = public.normalize_phone_digits(p_phone)
      AND length(public.normalize_phone_digits(p_phone)) >= 10
      AND id IS DISTINCT FROM p_user_id
  );
$$;

REVOKE ALL ON FUNCTION public.check_phone_available(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_phone_available(text, uuid) TO authenticated;
