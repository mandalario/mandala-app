DO $$
DECLARE
  new_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated',
    'mandalariodev@gmail.com', crypt('12345678', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Admin"}',
    now(), now(), '', '', '', ''
  );

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, jsonb_build_object('sub', new_id::text, 'email', 'mandalariodev@gmail.com'), 'email', new_id::text, now(), now(), now());

  UPDATE public.profiles SET approval_status = 'approved', profile_completed = true, full_name = 'Admin' WHERE id = new_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'admin') ON CONFLICT DO NOTHING;
  DELETE FROM public.user_roles WHERE user_id = new_id AND role = 'student';
END $$;