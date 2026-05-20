-- Add alternate_type to weekly_schedule_templates
ALTER TABLE public.weekly_schedule_templates ADD COLUMN IF NOT EXISTS alternate_type boolean DEFAULT false;

-- Update generate_slots_from_period to support alternation
CREATE OR REPLACE FUNCTION public.generate_slots_from_period(
  _date date,
  _start time,
  _end time,
  _duration_min integer,
  _capacity integer,
  _location text,
  _notes text,
  _class_type public.class_type DEFAULT 'avulsa_grupo',
  _alternate boolean DEFAULT false
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur time := _start;
  nxt time;
  created_count integer := 0;
  v_type public.class_type := _class_type;
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
      VALUES (_date, cur, nxt, _capacity, _location, _notes, true, v_type);
      created_count := created_count + 1;
    END IF;

    -- Alternate type for the next slot if requested
    IF _alternate THEN
      IF v_type = 'avulsa_grupo' THEN
        v_type := 'avulsa_particular';
      ELSIF v_type = 'avulsa_particular' THEN
        v_type := 'avulsa_grupo';
      END IF;
    END IF;

    cur := nxt;
  END LOOP;
  RETURN created_count;
END;
$$;
