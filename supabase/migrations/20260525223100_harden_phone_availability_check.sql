-- Ignore invalid/orphan profile rows when checking phone availability.
CREATE OR REPLACE FUNCTION public.check_phone_available(p_phone text, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.phone_digits = public.normalize_phone_digits(p_phone)
      AND length(public.normalize_phone_digits(p_phone)) >= 10
      AND p.id IS DISTINCT FROM p_user_id
  );
$$;

REVOKE ALL ON FUNCTION public.check_phone_available(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_phone_available(text, uuid) TO authenticated;
