-- Safari has a separate session from the native app. Let visitors browse
-- the active class catalog before signing in to pay.
GRANT SELECT ON TABLE public.credit_packages TO anon;

CREATE POLICY "Visitors read active packages"
ON public.credit_packages
FOR SELECT
TO anon
USING (is_active = true);

-- Payment creation and payment history still require authentication.
