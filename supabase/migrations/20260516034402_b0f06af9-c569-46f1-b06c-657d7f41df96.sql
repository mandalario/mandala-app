-- Create privacy acceptances table (mirrors terms_acceptances)
CREATE TABLE public.privacy_acceptances (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    privacy_id UUID NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.privacy_acceptances ENABLE ROW LEVEL SECURITY;

-- Users can view their own acceptances
CREATE POLICY "Users can view own privacy acceptances"
ON public.privacy_acceptances
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own acceptances
CREATE POLICY "Users can insert own privacy acceptances"
ON public.privacy_acceptances
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can view all acceptances
CREATE POLICY "Admins can view all privacy acceptances"
ON public.privacy_acceptances
FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
));