-- Migration to activate can_swim for all existing accounts and prevent it from being modified to false.

-- 1) Activate can_swim for all existing profiles
UPDATE public.profiles SET can_swim = true WHERE can_swim IS DISTINCT FROM true;

-- 2) Create trigger function to enforce can_swim to always be true
CREATE OR REPLACE FUNCTION public.enforce_can_swim()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.can_swim := true;
  RETURN NEW;
END;
$$;

-- 3) Drop trigger if exists and create it BEFORE INSERT OR UPDATE on public.profiles
DROP TRIGGER IF EXISTS enforce_can_swim_trigger ON public.profiles;

CREATE TRIGGER enforce_can_swim_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_can_swim();
