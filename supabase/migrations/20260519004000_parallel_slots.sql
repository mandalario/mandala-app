-- Update generate_slots_from_period to support parallel Group and Particular slots
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
BEGIN
  IF NOT _bypass_auth AND NOT has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem gerar horários';
  END IF;
  IF _duration_min <= 0 THEN RAISE EXCEPTION 'Duração inválida'; END IF;

  WHILE cur + (_duration_min || ' minutes')::interval <= _end LOOP
    nxt := cur + (_duration_min || ' minutes')::interval;

    -- 1. Create Group Slot
    IF _create_both OR _class_type = 'avulsa_grupo' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.class_slots
        WHERE date = _date AND start_time = cur AND end_time = nxt AND class_type = 'avulsa_grupo'
      ) THEN
        INSERT INTO public.class_slots(date, start_time, end_time, capacity, location, notes, is_open, class_type)
        VALUES (_date, cur, nxt, _capacity, _location, _notes, true, 'avulsa_grupo');
        created_count := created_count + 1;
      END IF;
    END IF;

    -- 2. Create Particular Slot
    IF _create_both OR _class_type = 'avulsa_particular' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.class_slots
        WHERE date = _date AND start_time = cur AND end_time = nxt AND class_type = 'avulsa_particular'
      ) THEN
        -- Capacity for particular is always 1 if parallel, otherwise use provided capacity
        INSERT INTO public.class_slots(date, start_time, end_time, capacity, location, notes, is_open, class_type)
        VALUES (_date, cur, nxt, CASE WHEN _create_both THEN 1 ELSE _capacity END, _location, _notes, true, 'avulsa_particular');
        created_count := created_count + 1;
      END IF;
    END IF;

    -- 3. Create Rental Slot (only if not both and type is aluguel)
    IF _class_type = 'aluguel' AND NOT _create_both THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.class_slots
        WHERE date = _date AND start_time = cur AND end_time = nxt AND class_type = 'aluguel'
      ) THEN
        INSERT INTO public.class_slots(date, start_time, end_time, capacity, location, notes, is_open, class_type)
        VALUES (_date, cur, nxt, _capacity, _location, _notes, true, 'aluguel');
        created_count := created_count + 1;
      END IF;
    END IF;

    cur := nxt;
  END LOOP;
  RETURN created_count;
END;
$$;
