
-- 1) Templates semanais
CREATE TABLE public.weekly_schedule_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  duration_min integer NOT NULL DEFAULT 60 CHECK (duration_min > 0),
  capacity integer NOT NULL DEFAULT 1 CHECK (capacity > 0),
  location text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_schedule_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage templates" ON public.weekly_schedule_templates
  FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "Auth read templates" ON public.weekly_schedule_templates
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER trg_wst_updated BEFORE UPDATE ON public.weekly_schedule_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Função para gerar slots a partir de um período
CREATE OR REPLACE FUNCTION public.generate_slots_from_period(
  _date date,
  _start time,
  _end time,
  _duration_min integer,
  _capacity integer,
  _location text,
  _notes text
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
      INSERT INTO public.class_slots(date, start_time, end_time, capacity, location, notes, is_open)
      VALUES (_date, cur, nxt, _capacity, _location, _notes, true);
      created_count := created_count + 1;
    END IF;
    cur := nxt;
  END LOOP;
  RETURN created_count;
END;
$$;

-- 3) Trigger: bloquear dia ao definir mar bad/flat, devolver créditos e notificar
CREATE OR REPLACE FUNCTION public.handle_surf_condition_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
  is_block boolean;
  was_block boolean;
BEGIN
  is_block := NEW.condition IN ('bad','flat');
  was_block := COALESCE(OLD.condition IN ('bad','flat'), false);

  IF is_block THEN
    -- fecha todos os slots do dia
    UPDATE public.class_slots SET is_open = false WHERE date = NEW.date;

    -- cancela bookings confirmados, devolve crédito e notifica
    FOR rec IN
      SELECT b.id, b.user_id, b.slot_id
      FROM public.bookings b
      JOIN public.class_slots s ON s.id = b.slot_id
      WHERE s.date = NEW.date AND b.status = 'confirmed'
    LOOP
      UPDATE public.bookings SET status = 'cancelled' WHERE id = rec.id;
      -- credit refund handled by handle_booking_change trigger on UPDATE
      INSERT INTO public.notifications(user_id, title, body, kind)
      VALUES (rec.user_id,
              'Aula cancelada',
              'Sua aula em ' || to_char(NEW.date,'DD/MM') || ' foi cancelada por condições do mar. Seu crédito foi devolvido.',
              'booking');
    END LOOP;
  ELSIF was_block AND NOT is_block THEN
    -- reabre slots do dia
    UPDATE public.class_slots SET is_open = true WHERE date = NEW.date;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_surf_condition_change ON public.surf_conditions;
CREATE TRIGGER trg_surf_condition_change
  AFTER INSERT OR UPDATE OF condition ON public.surf_conditions
  FOR EACH ROW EXECUTE FUNCTION public.handle_surf_condition_change();
