
-- ============= TERMOS =============
CREATE TABLE public.terms_of_service (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  title text NOT NULL DEFAULT 'Termos de Uso',
  content text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.terms_of_service ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can read active terms" ON public.terms_of_service FOR SELECT TO authenticated USING (is_active = true OR has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage terms" ON public.terms_of_service FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_tos_updated BEFORE UPDATE ON public.terms_of_service FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.terms_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  terms_id uuid NOT NULL REFERENCES public.terms_of_service(id) ON DELETE CASCADE,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, terms_id)
);
ALTER TABLE public.terms_acceptances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own acceptance" ON public.terms_acceptances FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own acceptance" ON public.terms_acceptances FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all acceptances" ON public.terms_acceptances FOR SELECT USING (has_role(auth.uid(),'admin'));

-- ============= PACOTES & PAGAMENTOS =============
CREATE TABLE public.credit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  credits integer NOT NULL CHECK (credits > 0),
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read active packages" ON public.credit_packages FOR SELECT TO authenticated USING (is_active = true OR has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage packages" ON public.credit_packages FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_pkg_updated BEFORE UPDATE ON public.credit_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TYPE public.payment_status AS ENUM ('pending','approved','rejected');

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  package_id uuid REFERENCES public.credit_packages(id) ON DELETE SET NULL,
  credits integer NOT NULL,
  amount_cents integer NOT NULL,
  proof_path text,
  status public.payment_status NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own payments" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "Users create own payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update payments" ON public.payments FOR UPDATE USING (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_pay_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função: ao aprovar pagamento, somar créditos
CREATE OR REPLACE FUNCTION public.handle_payment_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE public.profiles SET credits = credits + NEW.credits WHERE id = NEW.user_id;
    INSERT INTO public.notifications(user_id, title, body, kind)
    VALUES (NEW.user_id, 'Créditos liberados', 'Seu pagamento foi aprovado! +' || NEW.credits || ' crédito(s).', 'payment');
  ELSIF NEW.status = 'rejected' AND (OLD.status IS DISTINCT FROM 'rejected') THEN
    INSERT INTO public.notifications(user_id, title, body, kind)
    VALUES (NEW.user_id, 'Pagamento recusado', COALESCE(NEW.admin_notes,'Verifique e envie novamente.'), 'payment');
  END IF;
  RETURN NEW;
END;$$;

-- ============= CONDIÇÃO DO MAR =============
CREATE TYPE public.sea_condition AS ENUM ('good','medium','bad','flat');

CREATE TABLE public.surf_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  condition public.sea_condition NOT NULL,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.surf_conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read conditions" ON public.surf_conditions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage conditions" ON public.surf_conditions FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_cond_updated BEFORE UPDATE ON public.surf_conditions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= AGENDA =============
CREATE TABLE public.class_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  capacity integer NOT NULL DEFAULT 1 CHECK (capacity > 0),
  location text,
  notes text,
  is_open boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_slots_date ON public.class_slots(date);
ALTER TABLE public.class_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read slots" ON public.class_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage slots" ON public.class_slots FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_slot_updated BEFORE UPDATE ON public.class_slots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TYPE public.booking_status AS ENUM ('confirmed','cancelled','completed','no_show');

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL REFERENCES public.class_slots(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'confirmed',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slot_id, user_id)
);
CREATE INDEX idx_bookings_user ON public.bookings(user_id);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own bookings" ON public.bookings FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "Users create own bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own bookings" ON public.bookings FOR UPDATE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete bookings" ON public.bookings FOR DELETE USING (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_book_updated BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: créditos ao criar/cancelar booking + capacity check + approval check
CREATE OR REPLACE FUNCTION public.handle_booking_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_credits integer;
  taken integer;
  cap integer;
  is_open boolean;
  status_user public.approval_status;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT approval_status INTO status_user FROM public.profiles WHERE id = NEW.user_id;
    IF status_user <> 'approved' THEN RAISE EXCEPTION 'Cadastro pendente de aprovação'; END IF;
    SELECT capacity, class_slots.is_open INTO cap, is_open FROM public.class_slots WHERE id = NEW.slot_id;
    IF NOT is_open THEN RAISE EXCEPTION 'Horário fechado'; END IF;
    SELECT count(*) INTO taken FROM public.bookings WHERE slot_id = NEW.slot_id AND status = 'confirmed';
    IF taken >= cap THEN RAISE EXCEPTION 'Sem vagas neste horário'; END IF;
    SELECT credits INTO current_credits FROM public.profiles WHERE id = NEW.user_id;
    IF current_credits < 1 THEN RAISE EXCEPTION 'Créditos insuficientes'; END IF;
    UPDATE public.profiles SET credits = credits - 1 WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN
      UPDATE public.profiles SET credits = credits + 1 WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_booking_change
BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.handle_booking_change();

-- ============= POSTS =============
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  youtube_url text,
  thumbnail_url text,
  is_published boolean NOT NULL DEFAULT true,
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read published posts" ON public.posts FOR SELECT TO authenticated USING (is_published OR has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage posts" ON public.posts FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_post_updated BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= CHAT =============
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- conversation_user é sempre o aluno (chat aluno↔admin)
  conversation_user uuid NOT NULL,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_conv ON public.chat_messages(conversation_user, created_at);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Conv participants view" ON public.chat_messages FOR SELECT TO authenticated USING (auth.uid() = conversation_user OR has_role(auth.uid(),'admin'));
CREATE POLICY "Conv participants send" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid() AND (auth.uid() = conversation_user OR has_role(auth.uid(),'admin'))
);
CREATE POLICY "Conv participants mark read" ON public.chat_messages FOR UPDATE TO authenticated USING (auth.uid() = conversation_user OR has_role(auth.uid(),'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- ============= NOTIFICAÇÕES =============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  kind text NOT NULL DEFAULT 'info',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifs" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "Users update own notifs" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins create notifs" ON public.notifications FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin') OR auth.uid() = user_id);

CREATE TRIGGER trg_payment_approval
AFTER UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.handle_payment_approval();

-- ============= STORAGE BUCKETS =============
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs','payment-proofs', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('post-thumbnails','post-thumbnails', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars','avatars', true) ON CONFLICT DO NOTHING;

-- payment-proofs: dono e admin
CREATE POLICY "Owner read proof" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='payment-proofs' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(),'admin')));
CREATE POLICY "Owner upload proof" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- post-thumbnails: público read, admin write
CREATE POLICY "Public read thumbs" ON storage.objects FOR SELECT USING (bucket_id='post-thumbnails');
CREATE POLICY "Admin write thumbs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='post-thumbnails' AND has_role(auth.uid(),'admin'));
CREATE POLICY "Admin update thumbs" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id='post-thumbnails' AND has_role(auth.uid(),'admin'));
CREATE POLICY "Admin delete thumbs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='post-thumbnails' AND has_role(auth.uid(),'admin'));

-- avatars: público read, dono escreve
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id='avatars');
CREATE POLICY "Owner write avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owner update avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id='avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============= SEED inicial =============
INSERT INTO public.terms_of_service (version, title, content, is_active) VALUES (
  '1.0', 'Termos de Uso — ONDA',
$$Bem-vindo à ONDA. Ao usar nossa plataforma você concorda com os termos abaixo.

1. RISCOS DA PRÁTICA DO SURF
O surf é uma atividade física que envolve riscos naturais (correntezas, ondas, fauna marinha, lesões). Você declara estar ciente desses riscos e que pratica por conta e risco próprios.

2. CONDIÇÃO FÍSICA E SAÚDE
Você declara estar em condição física adequada à prática do surf e ter informado eventuais condições médicas no cadastro. É sua responsabilidade manter essas informações atualizadas.

3. CRÉDITOS E PAGAMENTOS
Cada agendamento de aula consome 1 crédito. Os créditos são liberados após a aprovação do pagamento via Pix. Créditos não são reembolsáveis em dinheiro, mas permanecem na conta para uso futuro.

4. CANCELAMENTO E REAGENDAMENTO
Cancelamentos feitos com até 12h de antecedência devolvem o crédito. Após esse prazo, o crédito é consumido. No-shows não têm direito a devolução.

5. CONDIÇÕES DO MAR
A escola pode cancelar ou remarcar aulas em caso de condições adversas do mar. Nesses casos, o crédito será devolvido automaticamente.

6. COMPORTAMENTO
É esperada postura respeitosa com instrutores, colegas e o ambiente. Comportamento inadequado pode resultar em suspensão sem reembolso.

7. IMAGEM
Você autoriza o uso de fotos e vídeos das aulas para fins de divulgação, salvo manifestação em contrário por escrito.

8. PROTEÇÃO DE DADOS
Seus dados são tratados conforme a LGPD e usados exclusivamente para a operação da escola.

9. ALTERAÇÕES
Estes termos podem ser atualizados. Você será notificado e poderá aceitar a nova versão.

Ao marcar a caixa abaixo, você declara ter lido e concordado com todos os termos acima.$$,
  true
);

INSERT INTO public.credit_packages (name, description, credits, price_cents, sort_order) VALUES
  ('Aula Avulsa','1 aula para experimentar', 1, 12000, 1),
  ('Pacote 4 Aulas','Ideal para iniciantes', 4, 44000, 2),
  ('Pacote 10 Aulas','Melhor custo-benefício', 10, 100000, 3);
