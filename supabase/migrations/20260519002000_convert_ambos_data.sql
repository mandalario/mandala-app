-- Convert any existing 'ambos' class_slots to 'avulsa_grupo'
UPDATE public.class_slots SET class_type = 'avulsa_grupo' WHERE class_type = 'ambos';

-- Convert any existing 'ambos' weekly_schedule_templates to 'avulsa_grupo'
UPDATE public.weekly_schedule_templates SET class_type = 'avulsa_grupo' WHERE class_type = 'ambos';

-- Note: We keep the enum value 'ambos' for now to avoid breaking existing logic that might reference it,
-- but we ensure no active data uses it.
