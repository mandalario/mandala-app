-- 1. Update the range generation function to be more flexible for migrations
CREATE OR REPLACE FUNCTION public.apply_active_templates_to_range(
  _start_date date,
  _days integer,
  _bypass_auth boolean DEFAULT false
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
  IF NOT _bypass_auth AND NOT has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem gerar horários';
  END IF;

  v_end_date := _start_date + (_days - 1);
  v_date := _start_date;

  WHILE v_date <= v_end_date LOOP
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
        v_tpl.alternate_type,
        _bypass_auth
      );
      v_count := v_count + COALESCE(v_day_count, 0);
    END LOOP;
    v_date := v_date + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 2. Configure all active templates to be Parallel (Group + Particular)
UPDATE public.weekly_schedule_templates
SET alternate_type = true, class_type = 'avulsa_grupo'
WHERE is_active = true;

-- 3. Execute the generation for 365 days starting today
SELECT public.apply_active_templates_to_range(CURRENT_DATE, 365, true);
