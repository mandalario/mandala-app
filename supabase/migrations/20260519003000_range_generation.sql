-- Function to apply active templates to a date range efficiently
CREATE OR REPLACE FUNCTION public.apply_active_templates_to_range(
  _start_date date,
  _days integer
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date date;
  v_end_date date;
  v_count integer := 0;
  v_tpl RECORD;
  v_day_count integer;
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem gerar horários';
  END IF;

  v_end_date := _start_date + (_days - 1);
  v_date := _start_date;

  WHILE v_date <= v_end_date LOOP
    -- Skip days with bad/flat conditions
    IF NOT EXISTS (
      SELECT 1 FROM public.surf_conditions
      WHERE date = v_date AND (condition = 'bad' OR condition = 'flat')
    ) THEN
      FOR v_tpl IN
        SELECT * FROM public.weekly_schedule_templates
        WHERE is_active = true AND weekday = extract(dow from v_date)
      LOOP
        v_day_count := public.generate_slots_from_period(
          v_date,
          v_tpl.start_time,
          v_tpl.end_time,
          v_tpl.duration_min,
          v_tpl.capacity,
          v_tpl.location,
          v_tpl.notes,
          v_tpl.class_type,
          v_tpl.alternate_type
        );
        v_count := v_count + COALESCE(v_day_count, 0);
      END LOOP;
    END IF;
    v_date := v_date + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
