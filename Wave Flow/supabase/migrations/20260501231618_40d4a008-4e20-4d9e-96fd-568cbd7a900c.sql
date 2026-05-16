-- 1) Default billing setting
INSERT INTO public.app_settings (key, value)
VALUES ('billing_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- 2) Admin-only secrets table
CREATE TABLE IF NOT EXISTS public.admin_secrets (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage admin_secrets"
ON public.admin_secrets
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER admin_secrets_updated_at
BEFORE UPDATE ON public.admin_secrets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed MP keys (empty)
INSERT INTO public.admin_secrets (key, value) VALUES
  ('mp_access_token', NULL),
  ('mp_environment', 'sandbox'),
  ('mp_webhook_secret', NULL)
ON CONFLICT (key) DO NOTHING;

-- 3) MP columns on payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS mp_payment_id text,
  ADD COLUMN IF NOT EXISTS mp_qr_code text,
  ADD COLUMN IF NOT EXISTS mp_qr_code_base64 text,
  ADD COLUMN IF NOT EXISTS mp_status_detail text,
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_payments_mp_payment_id
  ON public.payments(mp_payment_id) WHERE mp_payment_id IS NOT NULL;

-- 4) Update booking trigger to respect billing toggle
CREATE OR REPLACE FUNCTION public.handle_booking_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_credits integer;
  taken integer;
  cap integer;
  is_open boolean;
  status_user public.approval_status;
  user_level public.surf_level;
  slot_min public.surf_level;
  day_min public.surf_level;
  slot_date date;
  level_rank int;
  required_rank int;
  billing_on boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT approval_status, surf_level INTO status_user, user_level FROM public.profiles WHERE id = NEW.user_id;
    IF status_user <> 'approved' THEN RAISE EXCEPTION 'Cadastro pendente de aprovação'; END IF;

    SELECT capacity, class_slots.is_open, class_slots.min_level, class_slots.date
      INTO cap, is_open, slot_min, slot_date FROM public.class_slots WHERE id = NEW.slot_id;
    IF NOT is_open THEN RAISE EXCEPTION 'Horário fechado'; END IF;

    SELECT sc.min_level INTO day_min FROM public.surf_conditions sc WHERE sc.date = slot_date;

    IF slot_min IS NOT NULL OR day_min IS NOT NULL THEN
      level_rank := CASE user_level
        WHEN 'iniciante' THEN 1 WHEN 'intermediario' THEN 2 WHEN 'avancado' THEN 3 ELSE 0 END;
      required_rank := GREATEST(
        CASE slot_min WHEN 'iniciante' THEN 1 WHEN 'intermediario' THEN 2 WHEN 'avancado' THEN 3 ELSE 0 END,
        CASE day_min  WHEN 'iniciante' THEN 1 WHEN 'intermediario' THEN 2 WHEN 'avancado' THEN 3 ELSE 0 END
      );
      IF level_rank < required_rank THEN
        RAISE EXCEPTION 'Esta aula é restrita a alunos de nível superior';
      END IF;
    END IF;

    SELECT count(*) INTO taken FROM public.bookings WHERE slot_id = NEW.slot_id AND status = 'confirmed';
    IF taken >= cap THEN RAISE EXCEPTION 'Sem vagas neste horário'; END IF;

    -- Check billing toggle
    SELECT (value = 'true') INTO billing_on FROM public.app_settings WHERE key = 'billing_enabled';
    billing_on := COALESCE(billing_on, false);

    IF billing_on THEN
      SELECT credits INTO current_credits FROM public.profiles WHERE id = NEW.user_id;
      IF current_credits < 1 THEN RAISE EXCEPTION 'Créditos insuficientes'; END IF;
      UPDATE public.profiles SET credits = credits - 1 WHERE id = NEW.user_id;
    END IF;

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only refund if billing was on (we infer by: only refund if status changes confirmed->cancelled and billing currently on OR credits previously deducted; safest: refund only if billing currently on)
    SELECT (value = 'true') INTO billing_on FROM public.app_settings WHERE key = 'billing_enabled';
    billing_on := COALESCE(billing_on, false);
    IF OLD.status = 'confirmed' AND NEW.status = 'cancelled' AND billing_on THEN
      UPDATE public.profiles SET credits = credits + 1 WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$function$;