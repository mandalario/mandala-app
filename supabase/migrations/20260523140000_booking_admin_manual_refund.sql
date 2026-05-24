-- Track whether booking credit was refunded; allow admin manual refund for late cancellations.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS credit_refunded boolean NOT NULL DEFAULT false;

-- Past cancellations assumed refunded (avoid showing stale pending items).
UPDATE public.bookings
SET credit_refunded = true
WHERE status = 'cancelled';

CREATE OR REPLACE FUNCTION public.handle_booking_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_credits integer;
  taken integer;
  status_user public.approval_status;
  user_level public.surf_level;
  day_min public.surf_level;
  level_rank int;
  required_rank int;
  billing_on boolean;
  slot_rec RECORD;
  slot_date date;
  cancel_deadline timestamptz;
  is_admin boolean;
  should_refund boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.credit_refunded := false;

    SELECT approval_status, surf_level INTO status_user, user_level FROM public.profiles WHERE id = NEW.user_id;
    IF status_user <> 'approved' THEN RAISE EXCEPTION 'Cadastro pendente de aprovação'; END IF;

    SELECT * INTO slot_rec FROM public.class_slots WHERE id = NEW.slot_id;

    IF NOT slot_rec.is_open THEN RAISE EXCEPTION 'Horário fechado'; END IF;

    SELECT sc.min_level INTO day_min FROM public.surf_conditions sc WHERE sc.date = slot_rec.date;

    IF slot_rec.min_level IS NOT NULL OR day_min IS NOT NULL THEN
      level_rank := CASE user_level
        WHEN 'iniciante' THEN 1 WHEN 'intermediario' THEN 2 WHEN 'avancado' THEN 3 ELSE 0 END;
      required_rank := GREATEST(
        CASE slot_rec.min_level WHEN 'iniciante' THEN 1 WHEN 'intermediario' THEN 2 WHEN 'avancado' THEN 3 ELSE 0 END,
        CASE day_min  WHEN 'iniciante' THEN 1 WHEN 'intermediario' THEN 2 WHEN 'avancado' THEN 3 ELSE 0 END
      );
      IF level_rank < required_rank THEN
        RAISE EXCEPTION 'Esta aula é restrita a alunos de nível superior';
      END IF;
    END IF;

    SELECT count(*) INTO taken FROM public.bookings WHERE slot_id = NEW.slot_id AND status = 'confirmed';
    IF taken >= slot_rec.capacity THEN RAISE EXCEPTION 'Sem vagas neste horário'; END IF;

    SELECT (value = 'true') INTO billing_on FROM public.app_settings WHERE key = 'billing_enabled';
    billing_on := COALESCE(billing_on, false);

    IF billing_on THEN
      IF slot_rec.class_type = 'avulsa_grupo' THEN
        SELECT credits_grupo INTO current_credits FROM public.profiles WHERE id = NEW.user_id;
        IF current_credits < 1 THEN RAISE EXCEPTION 'Créditos insuficientes'; END IF;
        UPDATE public.profiles SET credits_grupo = credits_grupo - 1 WHERE id = NEW.user_id;
        NEW.credit_used := 'avulsa_grupo';
      ELSIF slot_rec.class_type = 'avulsa_particular' THEN
        SELECT credits_particular INTO current_credits FROM public.profiles WHERE id = NEW.user_id;
        IF current_credits < 1 THEN RAISE EXCEPTION 'Créditos insuficientes'; END IF;
        UPDATE public.profiles SET credits_particular = credits_particular - 1 WHERE id = NEW.user_id;
        NEW.credit_used := 'avulsa_particular';
      ELSIF slot_rec.class_type = 'aluguel' THEN
        SELECT credits_aluguel INTO current_credits FROM public.profiles WHERE id = NEW.user_id;
        IF current_credits < 1 THEN RAISE EXCEPTION 'Créditos insuficientes'; END IF;
        UPDATE public.profiles SET credits_aluguel = credits_aluguel - 1 WHERE id = NEW.user_id;
        NEW.credit_used := 'aluguel';
      END IF;
    ELSE
      NEW.credit_used := slot_rec.class_type;
    END IF;

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT (value = 'true') INTO billing_on FROM public.app_settings WHERE key = 'billing_enabled';
    billing_on := COALESCE(billing_on, false);
    IF OLD.status = 'confirmed' AND NEW.status = 'cancelled' AND billing_on THEN
      is_admin := COALESCE(public.has_role(auth.uid(), 'admin'), false);

      IF is_admin OR auth.uid() IS NULL OR auth.uid() <> NEW.user_id THEN
        should_refund := true;
      ELSE
        SELECT cs.date INTO slot_date FROM public.class_slots cs WHERE cs.id = NEW.slot_id;
        cancel_deadline := ((slot_date - interval '1 day')::timestamp + time '23:59:59.999') AT TIME ZONE 'America/Sao_Paulo';
        should_refund := now() <= cancel_deadline;
      END IF;

      IF should_refund THEN
        IF OLD.credit_used = 'avulsa_grupo' THEN
          UPDATE public.profiles SET credits_grupo = credits_grupo + 1 WHERE id = NEW.user_id;
        ELSIF OLD.credit_used = 'avulsa_particular' THEN
          UPDATE public.profiles SET credits_particular = credits_particular + 1 WHERE id = NEW.user_id;
        ELSIF OLD.credit_used = 'aluguel' THEN
          UPDATE public.profiles SET credits_aluguel = credits_aluguel + 1 WHERE id = NEW.user_id;
        END IF;
        NEW.credit_refunded := true;
      ELSE
        NEW.credit_refunded := false;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_refund_booking_credit(
  p_booking_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  b record;
  billing_on boolean;
  reason_text text;
BEGIN
  IF NOT COALESCE(public.has_role(auth.uid(), 'admin'), false) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO b FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agendamento não encontrado';
  END IF;
  IF b.status <> 'cancelled' THEN
    RAISE EXCEPTION 'Só é possível devolver crédito de agendamentos cancelados';
  END IF;
  IF b.credit_refunded THEN
    RAISE EXCEPTION 'Crédito já foi devolvido';
  END IF;
  IF b.credit_used IS NULL THEN
    RAISE EXCEPTION 'Este agendamento não utilizou crédito';
  END IF;

  SELECT (value = 'true') INTO billing_on FROM public.app_settings WHERE key = 'billing_enabled';
  billing_on := COALESCE(billing_on, false);
  IF NOT billing_on THEN
    RAISE EXCEPTION 'Cobrança por créditos está desativada';
  END IF;

  IF b.credit_used = 'avulsa_grupo' THEN
    UPDATE public.profiles SET credits_grupo = credits_grupo + 1 WHERE id = b.user_id;
  ELSIF b.credit_used = 'avulsa_particular' THEN
    UPDATE public.profiles SET credits_particular = credits_particular + 1 WHERE id = b.user_id;
  ELSIF b.credit_used = 'aluguel' THEN
    UPDATE public.profiles SET credits_aluguel = credits_aluguel + 1 WHERE id = b.user_id;
  ELSE
    RAISE EXCEPTION 'Tipo de crédito inválido';
  END IF;

  reason_text := NULLIF(trim(p_reason), '');

  UPDATE public.bookings
  SET
    credit_refunded = true,
    notes = COALESCE(notes || E'\n', '') || 'Crédito devolvido pelo admin'
      || CASE WHEN reason_text IS NOT NULL THEN ': ' || reason_text ELSE '' END
  WHERE id = p_booking_id;

  INSERT INTO public.notifications(user_id, title, body, kind)
  VALUES (
    b.user_id,
    'Crédito devolvido',
    'Seu crédito foi devolvido após análise do cancelamento.'
      || CASE WHEN reason_text IS NOT NULL THEN ' Motivo: ' || reason_text ELSE '' END,
    'info'
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_refund_booking_credit(uuid, text) TO authenticated;
