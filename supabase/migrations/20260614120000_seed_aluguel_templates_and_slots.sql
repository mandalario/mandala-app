-- Aluguel slots were never backfilled because final_parallel_generation converted
-- all active weekly templates to grupo + alternate_type. Seed aluguel templates
-- from the active grupo schedule and generate rental slots for the next year.

-- 1. Clone active grupo templates into aluguel templates (skip if already present)
INSERT INTO public.weekly_schedule_templates (
  weekday,
  start_time,
  end_time,
  duration_min,
  capacity,
  location,
  notes,
  is_active,
  class_type,
  alternate_type
)
SELECT
  t.weekday,
  t.start_time,
  t.end_time,
  t.duration_min,
  t.capacity,
  t.location,
  t.notes,
  t.is_active,
  'aluguel'::public.class_type,
  false
FROM public.weekly_schedule_templates t
WHERE t.is_active = true
  AND t.class_type = 'avulsa_grupo'
  AND t.alternate_type = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.weekly_schedule_templates existing
    WHERE existing.weekday = t.weekday
      AND existing.start_time = t.start_time
      AND existing.end_time = t.end_time
      AND existing.class_type = 'aluguel'
  );

-- 2. Make slot generation idempotent (NOT EXISTS instead of ON CONFLICT without a unique index)
CREATE OR REPLACE FUNCTION public.generate_slots_from_period(
  _date date,
  _start time,
  _end time,
  _duration_min integer,
  _capacity integer,
  _location text,
  _notes text,
  _class_type public.class_type DEFAULT 'avulsa_grupo',
  _create_both boolean DEFAULT false,
  _bypass_auth boolean DEFAULT false
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur time := _start;
  nxt time;
  created_count integer := 0;
  final_location text;
BEGIN
  IF NOT _bypass_auth AND NOT has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem gerar horários';
  END IF;

  IF _duration_min <= 0 THEN RETURN 0; END IF;

  final_location := COALESCE(NULLIF(trim(_location), ''), 'Arpoador, Rio de Janeiro');

  WHILE cur + (_duration_min || ' minutes')::interval <= _end LOOP
    nxt := cur + (_duration_min || ' minutes')::interval;

    IF _create_both OR _class_type = 'avulsa_grupo' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.class_slots
        WHERE date = _date AND start_time = cur AND end_time = nxt AND class_type = 'avulsa_grupo'
      ) THEN
        INSERT INTO public.class_slots(date, start_time, end_time, capacity, location, notes, is_open, class_type)
        VALUES (_date, cur, nxt, _capacity, final_location, _notes, true, 'avulsa_grupo');
        created_count := created_count + 1;
      END IF;
    END IF;

    IF _create_both OR _class_type = 'avulsa_particular' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.class_slots
        WHERE date = _date AND start_time = cur AND end_time = nxt AND class_type = 'avulsa_particular'
      ) THEN
        INSERT INTO public.class_slots(date, start_time, end_time, capacity, location, notes, is_open, class_type)
        VALUES (_date, cur, nxt, CASE WHEN _create_both THEN 1 ELSE _capacity END, final_location, _notes, true, 'avulsa_particular');
        created_count := created_count + 1;
      END IF;
    END IF;

    IF _class_type = 'aluguel' AND NOT _create_both THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.class_slots
        WHERE date = _date AND start_time = cur AND end_time = nxt AND class_type = 'aluguel'
      ) THEN
        INSERT INTO public.class_slots(date, start_time, end_time, capacity, location, notes, is_open, class_type)
        VALUES (_date, cur, nxt, _capacity, final_location, _notes, true, 'aluguel');
        created_count := created_count + 1;
      END IF;
    END IF;

    cur := nxt;
  END LOOP;
  RETURN created_count;
END;
$$;

-- 3. Backfill rental slots for all active aluguel templates (next 365 days)
DO $$
DECLARE
  v_date date := CURRENT_DATE;
  v_end date := CURRENT_DATE + 364;
  v_tpl RECORD;
BEGIN
  WHILE v_date <= v_end LOOP
    FOR v_tpl IN
      SELECT * FROM public.weekly_schedule_templates
      WHERE is_active = true
        AND class_type = 'aluguel'
        AND NOT alternate_type
        AND weekday = extract(dow FROM v_date)
    LOOP
      PERFORM public.generate_slots_from_period(
        v_date,
        v_tpl.start_time,
        v_tpl.end_time,
        v_tpl.duration_min,
        v_tpl.capacity,
        v_tpl.location,
        v_tpl.notes,
        v_tpl.class_type,
        v_tpl.alternate_type,
        true
      );
    END LOOP;
    v_date := v_date + 1;
  END LOOP;
END $$;
