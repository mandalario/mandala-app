-- Restore rental (aluguel) slot generation removed in final_parallel_generation migration
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

    -- Grupo
    IF _create_both OR _class_type = 'avulsa_grupo' THEN
      INSERT INTO public.class_slots(date, start_time, end_time, capacity, location, notes, is_open, class_type)
      VALUES (_date, cur, nxt, _capacity, final_location, _notes, true, 'avulsa_grupo')
      ON CONFLICT DO NOTHING;
      created_count := created_count + 1;
    END IF;

    -- Particular
    IF _create_both OR _class_type = 'avulsa_particular' THEN
      INSERT INTO public.class_slots(date, start_time, end_time, capacity, location, notes, is_open, class_type)
      VALUES (_date, cur, nxt, CASE WHEN _create_both THEN 1 ELSE _capacity END, final_location, _notes, true, 'avulsa_particular')
      ON CONFLICT DO NOTHING;
      created_count := created_count + 1;
    END IF;

    -- Aluguel (only when type is aluguel and not parallel mode)
    IF _class_type = 'aluguel' AND NOT _create_both THEN
      INSERT INTO public.class_slots(date, start_time, end_time, capacity, location, notes, is_open, class_type)
      VALUES (_date, cur, nxt, _capacity, final_location, _notes, true, 'aluguel')
      ON CONFLICT DO NOTHING;
      created_count := created_count + 1;
    END IF;

    cur := nxt;
  END LOOP;
  RETURN created_count;
END;
$$;

-- Backfill rental slots for active aluguel templates (next 365 days)
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
