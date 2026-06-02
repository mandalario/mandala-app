-- Public legal pages failed for anonymous users because inactive rows evaluated
-- has_role(), which anon cannot execute. Split into simple active-only public read.

DROP POLICY IF EXISTS "Public can read active terms" ON public.terms_of_service;
DROP POLICY IF EXISTS "Public can read active privacy" ON public.privacy_policy;

CREATE POLICY "Anyone can read active terms"
ON public.terms_of_service
FOR SELECT
USING (is_active = true);

CREATE POLICY "Anyone can read active privacy"
ON public.privacy_policy
FOR SELECT
USING (is_active = true);
