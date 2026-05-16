DO $$ BEGIN
  CREATE TYPE public.post_category AS ENUM ('warm_up','pre_surfing');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS category public.post_category NOT NULL DEFAULT 'pre_surfing';