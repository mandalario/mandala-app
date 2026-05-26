-- Unifica +55 21… e 21… no mesmo phone_digits; libera órfãos e re-sincroniza.

CREATE OR REPLACE FUNCTION public.normalize_phone_digits(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  WITH raw AS (
    SELECT NULLIF(regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g'), '') AS d
  ),
  canon AS (
    SELECT CASE
      WHEN d IS NULL THEN NULL
      WHEN d ~ '^55\d{10,11}$' THEN substring(d FROM 3)
      ELSE d
    END AS d
    FROM raw
  )
  SELECT NULLIF(d, '') FROM canon;
$$;

-- Perfis sem usuário em auth não devem segurar o número.
UPDATE public.profiles
SET phone = NULL, phone_digits = NULL
WHERE phone_digits IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = profiles.id);

UPDATE public.profiles
SET phone_digits = public.normalize_phone_digits(phone)
WHERE phone IS NOT NULL
  AND phone_digits IS DISTINCT FROM public.normalize_phone_digits(phone);

REVOKE ALL ON FUNCTION public.check_phone_available(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_phone_available(text, uuid) TO authenticated;
