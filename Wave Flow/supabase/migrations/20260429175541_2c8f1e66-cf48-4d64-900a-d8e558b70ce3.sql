
INSERT INTO storage.buckets (id, name, public) VALUES ('partners','partners', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('banners','banners', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read partners" ON storage.objects FOR SELECT
  USING (bucket_id = 'partners');
CREATE POLICY "Admins write partners" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'partners' AND has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update partners" ON storage.objects FOR UPDATE
  USING (bucket_id = 'partners' AND has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete partners" ON storage.objects FOR DELETE
  USING (bucket_id = 'partners' AND has_role(auth.uid(),'admin'));

CREATE POLICY "Public read banners" ON storage.objects FOR SELECT
  USING (bucket_id = 'banners');
CREATE POLICY "Admins write banners" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'banners' AND has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update banners" ON storage.objects FOR UPDATE
  USING (bucket_id = 'banners' AND has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete banners" ON storage.objects FOR DELETE
  USING (bucket_id = 'banners' AND has_role(auth.uid(),'admin'));
