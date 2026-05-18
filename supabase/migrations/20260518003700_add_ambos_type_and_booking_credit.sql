-- 1. Add "ambos" to class_type enum if it doesn't exist
ALTER TYPE public.class_type ADD VALUE IF NOT EXISTS 'ambos';

-- 2. Add credit_used to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS credit_used public.class_type;

-- 3. Update handle_booking_change
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
  c_grupo int;
  c_part int;
  slot_rec RECORD;
BEGIN
  IF TG_OP = 'INSERT' THEN
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
      IF slot_rec.class_type = 'ambos' THEN
         
         IF NEW.credit_used = 'avulsa_grupo' THEN
            SELECT credits_grupo INTO current_credits FROM public.profiles WHERE id = NEW.user_id;
            IF current_credits < 1 THEN RAISE EXCEPTION 'Créditos insuficientes'; END IF;
            UPDATE public.profiles SET credits_grupo = credits_grupo - 1 WHERE id = NEW.user_id;
            
         ELSIF NEW.credit_used = 'avulsa_particular' THEN
            SELECT credits_particular INTO current_credits FROM public.profiles WHERE id = NEW.user_id;
            IF current_credits < 1 THEN RAISE EXCEPTION 'Créditos insuficientes'; END IF;
            UPDATE public.profiles SET credits_particular = credits_particular - 1 WHERE id = NEW.user_id;
            
         ELSE
            SELECT credits_grupo, credits_particular INTO c_grupo, c_part FROM public.profiles WHERE id = NEW.user_id;
            IF c_grupo > 0 THEN
                UPDATE public.profiles SET credits_grupo = credits_grupo - 1 WHERE id = NEW.user_id;
                NEW.credit_used := 'avulsa_grupo';
            ELSIF c_part > 0 THEN
                UPDATE public.profiles SET credits_particular = credits_particular - 1 WHERE id = NEW.user_id;
                NEW.credit_used := 'avulsa_particular';
            ELSE
                RAISE EXCEPTION 'Créditos insuficientes';
            END IF;
         END IF;

      ELSIF slot_rec.class_type = 'avulsa_grupo' THEN
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
      IF slot_rec.class_type = 'ambos' AND NEW.credit_used IS NULL THEN
         NEW.credit_used := 'avulsa_grupo';
      ELSIF slot_rec.class_type <> 'ambos' THEN
         NEW.credit_used := slot_rec.class_type;
      END IF;
    END IF;

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT (value = 'true') INTO billing_on FROM public.app_settings WHERE key = 'billing_enabled';
    billing_on := COALESCE(billing_on, false);
    IF OLD.status = 'confirmed' AND NEW.status = 'cancelled' AND billing_on THEN
      IF OLD.credit_used = 'avulsa_grupo' THEN
        UPDATE public.profiles SET credits_grupo = credits_grupo + 1 WHERE id = NEW.user_id;
      ELSIF OLD.credit_used = 'avulsa_particular' THEN
        UPDATE public.profiles SET credits_particular = credits_particular + 1 WHERE id = NEW.user_id;
      ELSIF OLD.credit_used = 'aluguel' THEN
        UPDATE public.profiles SET credits_aluguel = credits_aluguel + 1 WHERE id = NEW.user_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$function$;
