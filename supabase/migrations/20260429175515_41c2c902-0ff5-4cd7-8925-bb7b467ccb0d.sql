
-- Partners
CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  logo_url text,
  website_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read active partners" ON public.partners FOR SELECT TO authenticated
  USING (is_active OR has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage partners" ON public.partners FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_partners_updated BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Home banners (linked optionally to partner)
CREATE TABLE public.home_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  title text,
  subtitle text,
  body text,
  background_image_url text,
  cta_label text,
  cta_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.home_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read active banners" ON public.home_banners FOR SELECT TO authenticated
  USING (is_active OR has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage banners" ON public.home_banners FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_home_banners_updated BEFORE UPDATE ON public.home_banners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Daily quotes (scheduled)
CREATE TABLE public.daily_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  author text,
  scheduled_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read quotes" ON public.daily_quotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage quotes" ON public.daily_quotes FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_daily_quotes_updated BEFORE UPDATE ON public.daily_quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Forecast providers (windguru, etc)
CREATE TABLE public.forecast_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,                -- 'windguru_widget' | 'windguru_api' | 'open_meteo_marine'
  label text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,  -- station_id, lat/lon, etc. (no secrets here)
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.forecast_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read providers" ON public.forecast_providers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage providers" ON public.forecast_providers FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_forecast_providers_updated BEFORE UPDATE ON public.forecast_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Only one active provider at a time
CREATE UNIQUE INDEX uniq_active_forecast_provider ON public.forecast_providers ((true)) WHERE is_active = true;

-- Level restrictions on slot + day
ALTER TABLE public.class_slots ADD COLUMN min_level public.surf_level;
ALTER TABLE public.surf_conditions ADD COLUMN min_level public.surf_level;

-- Enforce level on booking insert
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
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT approval_status, surf_level INTO status_user, user_level FROM public.profiles WHERE id = NEW.user_id;
    IF status_user <> 'approved' THEN RAISE EXCEPTION 'Cadastro pendente de aprovação'; END IF;

    SELECT capacity, class_slots.is_open, class_slots.min_level, class_slots.date
      INTO cap, is_open, slot_min, slot_date FROM public.class_slots WHERE id = NEW.slot_id;
    IF NOT is_open THEN RAISE EXCEPTION 'Horário fechado'; END IF;

    SELECT sc.min_level INTO day_min FROM public.surf_conditions sc WHERE sc.date = slot_date;

    -- Check level if a min is set
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
    SELECT credits INTO current_credits FROM public.profiles WHERE id = NEW.user_id;
    IF current_credits < 1 THEN RAISE EXCEPTION 'Créditos insuficientes'; END IF;
    UPDATE public.profiles SET credits = credits - 1 WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN
      UPDATE public.profiles SET credits = credits + 1 WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$function$;
