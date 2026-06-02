-- Anon users hit has_role() via "Admins manage *" FOR ALL (includes SELECT).
-- Keep public read on active rows only; scope admin SELECT to authenticated role.

DROP POLICY IF EXISTS "Admins manage terms" ON public.terms_of_service;
DROP POLICY IF EXISTS "Admins manage privacy" ON public.privacy_policy;

CREATE POLICY "Admins read all terms"
ON public.terms_of_service
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins insert terms"
ON public.terms_of_service
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update terms"
ON public.terms_of_service
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete terms"
ON public.terms_of_service
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins read all privacy"
ON public.privacy_policy
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins insert privacy"
ON public.privacy_policy
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update privacy"
ON public.privacy_policy
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete privacy"
ON public.privacy_policy
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
