-- Set default value for location in class_slots
ALTER TABLE public.class_slots ALTER COLUMN location SET DEFAULT 'Arpoador, Rio de Janeiro';

-- Set default value for location in weekly_schedule_templates
ALTER TABLE public.weekly_schedule_templates ALTER COLUMN location SET DEFAULT 'Arpoador, Rio de Janeiro';

-- Update existing null/empty locations to 'Arpoador, Rio de Janeiro'
UPDATE public.class_slots
SET location = 'Arpoador, Rio de Janeiro'
WHERE location IS NULL OR trim(location) = '';

UPDATE public.weekly_schedule_templates
SET location = 'Arpoador, Rio de Janeiro'
WHERE location IS NULL OR trim(location) = '';

-- Update the core function generate_slots_from_period to default to 'Arpoador, Rio de Janeiro' if _location is null or empty
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

    cur := nxt;
  END LOOP;
  RETURN created_count;
END;
$$;
