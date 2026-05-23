-- Permissões granulares do painel admin (áreas por usuário admin)

CREATE TYPE public.admin_area AS ENUM (
  'dashboard',
  'students',
  'teachers',
  'schedule',
  'forecast',
  'billing',
  'packages',
  'content',
  'posts',
  'chat',
  'notifications',
  'terms',
  'privacy',
  'access'
);

CREATE TABLE public.admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area public.admin_area NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, area)
);

ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND lower(email) IN (
        'contatomandalario@gmail.com',
        'pedrobrasil349@gmail.com'
      )
  )
$$;

-- Admin sem linhas em admin_permissions = acesso total (admins legados)
CREATE OR REPLACE FUNCTION public.has_admin_area(_area public.admin_area)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
    AND (
      public.is_super_admin()
      OR NOT EXISTS (
        SELECT 1 FROM public.admin_permissions WHERE user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.admin_permissions
        WHERE user_id = auth.uid() AND area = _area
      )
    )
$$;

CREATE POLICY "Admins can view own permissions"
  ON public.admin_permissions FOR SELECT
  USING (auth.uid() = user_id OR public.is_super_admin());

CREATE POLICY "Super admins manage permissions"
  ON public.admin_permissions FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
