
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_payment_approval() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_booking_change() FROM PUBLIC, anon, authenticated;

-- Substituir SELECT amplo por leitura por nome (evita listagem do bucket)
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read thumbs" ON storage.objects;

-- Permite leitura individual via getPublicUrl, mas bloqueia list()
CREATE POLICY "Avatars read by name" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND name IS NOT NULL AND position('/' in name) > 0);

CREATE POLICY "Thumbs read by name" ON storage.objects FOR SELECT
  USING (bucket_id = 'post-thumbnails' AND name IS NOT NULL AND position('/' in name) > 0);
