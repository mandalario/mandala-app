-- 1) Create class_type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'class_type') THEN
    CREATE TYPE public.class_type AS ENUM ('avulsa_grupo', 'avulsa_particular', 'aluguel');
  END IF;
END$$;

-- 2) Add class_type column to tables
ALTER TABLE public.class_slots ADD COLUMN IF NOT EXISTS class_type public.class_type NOT NULL DEFAULT 'avulsa_grupo';
ALTER TABLE public.weekly_schedule_templates ADD COLUMN IF NOT EXISTS class_type public.class_type NOT NULL DEFAULT 'avulsa_grupo';
ALTER TABLE public.credit_packages ADD COLUMN IF NOT EXISTS class_type public.class_type NOT NULL DEFAULT 'avulsa_grupo';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS class_type public.class_type NOT NULL DEFAULT 'avulsa_grupo';

-- 3) Add separate credit columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits_grupo integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits_particular integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits_aluguel integer NOT NULL DEFAULT 0;

-- 4) Migrate existing credits to group credits
UPDATE public.profiles SET credits_grupo = credits WHERE credits_grupo = 0 AND credits > 0;

-- 5) Update handle_payment_approval trigger function
CREATE OR REPLACE FUNCTION public.handle_payment_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    IF NEW.class_type = 'avulsa_grupo' THEN
      UPDATE public.profiles SET credits_grupo = credits_grupo + NEW.credits WHERE id = NEW.user_id;
    ELSIF NEW.class_type = 'avulsa_particular' THEN
      UPDATE public.profiles SET credits_particular = credits_particular + NEW.credits WHERE id = NEW.user_id;
    ELSIF NEW.class_type = 'aluguel' THEN
      UPDATE public.profiles SET credits_aluguel = credits_aluguel + NEW.credits WHERE id = NEW.user_id;
    END IF;
    
    INSERT INTO public.notifications(user_id, title, body, kind)
    VALUES (NEW.user_id, 'Créditos liberados', 'Seu pagamento foi aprovado! +' || NEW.credits || ' crédito(s).', 'payment');
  ELSIF NEW.status = 'rejected' AND (OLD.status IS DISTINCT FROM 'rejected') THEN
    INSERT INTO public.notifications(user_id, title, body, kind)
    VALUES (NEW.user_id, 'Pagamento recusado', COALESCE(NEW.admin_notes,'Verifique e envie novamente.'), 'payment');
  END IF;
  RETURN NEW;
END;$$;

-- 6) Update handle_booking_change trigger function
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
  slot_type public.class_type;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT approval_status, surf_level INTO status_user, user_level FROM public.profiles WHERE id = NEW.user_id;
    IF status_user <> 'approved' THEN RAISE EXCEPTION 'Cadastro pendente de aprovação'; END IF;

    SELECT capacity, class_slots.is_open, class_slots.min_level, class_slots.date, class_slots.class_type
      INTO cap, is_open, slot_min, slot_date, slot_type FROM public.class_slots WHERE id = NEW.slot_id;
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
      IF slot_type = 'avulsa_grupo' THEN
        SELECT credits_grupo INTO current_credits FROM public.profiles WHERE id = NEW.user_id;
        IF current_credits < 1 THEN RAISE EXCEPTION 'Créditos insuficientes'; END IF;
        UPDATE public.profiles SET credits_grupo = credits_grupo - 1 WHERE id = NEW.user_id;
      ELSIF slot_type = 'avulsa_particular' THEN
        SELECT credits_particular INTO current_credits FROM public.profiles WHERE id = NEW.user_id;
        IF current_credits < 1 THEN RAISE EXCEPTION 'Créditos insuficientes'; END IF;
        UPDATE public.profiles SET credits_particular = credits_particular - 1 WHERE id = NEW.user_id;
      ELSIF slot_type = 'aluguel' THEN
        SELECT credits_aluguel INTO current_credits FROM public.profiles WHERE id = NEW.user_id;
        IF current_credits < 1 THEN RAISE EXCEPTION 'Créditos insuficientes'; END IF;
        UPDATE public.profiles SET credits_aluguel = credits_aluguel - 1 WHERE id = NEW.user_id;
      END IF;
    END IF;

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only refund if billing was on
    SELECT (value = 'true') INTO billing_on FROM public.app_settings WHERE key = 'billing_enabled';
    billing_on := COALESCE(billing_on, false);
    IF OLD.status = 'confirmed' AND NEW.status = 'cancelled' AND billing_on THEN
      SELECT class_type INTO slot_type FROM public.class_slots WHERE id = NEW.slot_id;
      IF slot_type = 'avulsa_grupo' THEN
        UPDATE public.profiles SET credits_grupo = credits_grupo + 1 WHERE id = NEW.user_id;
      ELSIF slot_type = 'avulsa_particular' THEN
        UPDATE public.profiles SET credits_particular = credits_particular + 1 WHERE id = NEW.user_id;
      ELSIF slot_type = 'aluguel' THEN
        UPDATE public.profiles SET credits_aluguel = credits_aluguel + 1 WHERE id = NEW.user_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$function$;

-- 7) Update generate_slots_from_period function
CREATE OR REPLACE FUNCTION public.generate_slots_from_period(
  _date date,
  _start time,
  _end time,
  _duration_min integer,
  _capacity integer,
  _location text,
  _notes text,
  _class_type public.class_type DEFAULT 'avulsa_grupo'
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur time := _start;
  nxt time;
  created_count integer := 0;
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem gerar horários';
  END IF;
  IF _duration_min <= 0 THEN RAISE EXCEPTION 'Duração inválida'; END IF;

  WHILE cur + (_duration_min || ' minutes')::interval <= _end LOOP
    nxt := cur + (_duration_min || ' minutes')::interval;
    -- evita duplicar
    IF NOT EXISTS (
      SELECT 1 FROM public.class_slots
      WHERE date = _date AND start_time = cur AND end_time = nxt
    ) THEN
      INSERT INTO public.class_slots(date, start_time, end_time, capacity, location, notes, is_open, class_type)
      VALUES (_date, cur, nxt, _capacity, _location, _notes, true, _class_type);
      created_count := created_count + 1;
    END IF;
    cur := nxt;
  END LOOP;
  RETURN created_count;
END;
$$;
