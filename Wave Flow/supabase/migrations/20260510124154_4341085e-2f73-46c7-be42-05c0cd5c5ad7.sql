
CREATE TABLE public.privacy_policy (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version text NOT NULL,
  title text NOT NULL DEFAULT 'Política de Privacidade',
  content text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.privacy_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active privacy"
ON public.privacy_policy FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage privacy"
ON public.privacy_policy FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_privacy_policy_updated_at
BEFORE UPDATE ON public.privacy_policy
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Auth can read active terms" ON public.terms_of_service;
CREATE POLICY "Public can read active terms"
ON public.terms_of_service FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.terms_of_service (version, title, content, is_active)
SELECT '1.0', 'Termos de Uso', $TXT$TERMOS DE USO — MANDALA RIO SURF SCHOOL

1. ACEITAÇÃO
Ao criar uma conta e utilizar o aplicativo Mandala Rio Surf School, você concorda integralmente com estes Termos. Caso não concorde, não utilize o serviço.

2. SERVIÇO
O aplicativo permite agendar aulas de surf, comprar créditos, acompanhar condições do mar, acessar conteúdo educacional e se comunicar com instrutores.

3. CADASTRO E APROVAÇÃO
3.1. O cadastro exige informações verdadeiras e atualizadas.
3.2. O acesso completo é liberado após aprovação manual do instrutor.
3.3. Você é responsável pela confidencialidade das suas credenciais.

4. AULAS, CRÉDITOS E CANCELAMENTOS
4.1. Cada aula consome 1 crédito.
4.2. Créditos não são reembolsáveis em dinheiro, salvo determinação legal.
4.3. Aulas canceladas pela escola por condições do mar têm o crédito devolvido automaticamente.
4.4. Cancelamentos pelo aluno devem respeitar a antecedência informada pela escola.

5. PAGAMENTOS
5.1. Processados via Pix, Apple Pay ou outros meios disponíveis.
5.2. Créditos liberados após confirmação do pagamento.
5.3. A escola pode rejeitar pagamentos com indícios de fraude.

6. RISCOS DO SURF
6.1. O surf envolve riscos inerentes (condições do mar, lesões, afogamento).
6.2. Você declara estar em condições físicas adequadas e ter informado condições médicas relevantes.
6.3. A escola adota medidas razoáveis de segurança, mas não elimina todos os riscos.

7. CONDUTA
É proibido usar o app para fins ilegais, ofender ou assediar terceiros no chat, tentar acessar áreas restritas, ou compartilhar a conta.

8. PROPRIEDADE INTELECTUAL
Todo o conteúdo (vídeos, textos, marca, layout) pertence à Mandala Rio Surf School ou aos respectivos titulares.

9. LIMITAÇÃO DE RESPONSABILIDADE
Na máxima extensão permitida em lei, a escola não responde por danos indiretos decorrentes do uso do app.

10. ALTERAÇÕES
Estes termos podem ser atualizados; mudanças relevantes serão comunicadas no app.

11. RESCISÃO
Contas que violem estes termos podem ser suspensas ou encerradas.

12. LEI APLICÁVEL
Legislação brasileira. Foro: Comarca do Rio de Janeiro/RJ.

13. CONTATO
contato@mandalariosurf.com$TXT$, true
WHERE NOT EXISTS (SELECT 1 FROM public.terms_of_service WHERE is_active = true);

INSERT INTO public.privacy_policy (version, title, content, is_active)
VALUES ('1.0', 'Política de Privacidade', $TXT$POLÍTICA DE PRIVACIDADE — MANDALA RIO SURF SCHOOL

Esta Política descreve como tratamos seus dados pessoais no aplicativo Mandala Rio Surf School, em conformidade com a LGPD (Lei nº 13.709/2018).

1. CONTROLADOR
Mandala Rio Surf School. Encarregado: privacidade@mandalariosurf.com

2. DADOS COLETADOS
2.1. Cadastro: nome, email, telefone, idade, altura, peso.
2.2. Perfil de surf: nível, base, prancha, capacidade de nadar, observações.
2.3. Saúde e emergência: condições médicas e contato de emergência (apenas para sua segurança em aula).
2.4. Pagamentos: pacote, valor, status, comprovantes, identificadores Mercado Pago e tokens Apple Pay. NÃO armazenamos número completo de cartão.
2.5. Uso: aulas agendadas, mensagens com instrutor, notificações, idioma, foto de perfil.
2.6. Técnicos: logs de acesso, dispositivo, e dados do provedor de autenticação (Google, quando usado).

3. FINALIDADES
- Cadastro, login e aprovação de aluno;
- Agendar aulas e gerir créditos;
- Processar pagamentos;
- Comunicar avisos sobre aulas, mar e cobrança;
- Garantir segurança em aula;
- Cumprir obrigações legais e fiscais;
- Melhorar o serviço de forma agregada.

4. BASE LEGAL (LGPD)
- Execução de contrato (art. 7º, V);
- Obrigação legal (art. 7º, II);
- Consentimento para dados de saúde (art. 11, I);
- Legítimo interesse para segurança e prevenção a fraude (art. 7º, IX).

5. COMPARTILHAMENTO
Compartilhamos estritamente com:
- Mercado Pago e Apple Pay (pagamentos);
- Provedor de infraestrutura (Lovable Cloud);
- Google (autenticação opcional);
- Autoridades, quando exigido por lei.
Não vendemos seus dados.

6. SEGURANÇA
Criptografia em trânsito (TLS) e em repouso, controles de acesso por função, autenticação forte e logs de auditoria.

7. RETENÇÃO
Mantemos os dados enquanto a conta estiver ativa e pelo prazo legal aplicável (até 5 anos para registros financeiros). Você pode pedir exclusão a qualquer momento, ressalvadas obrigações legais.

8. SEUS DIREITOS (LGPD art. 18)
Confirmar tratamento, acessar, corrigir, anonimizar, eliminar dados desnecessários, portar, revogar consentimento, obter informações sobre compartilhamento. Solicite por: privacidade@mandalariosurf.com

9. CRIANÇAS E ADOLESCENTES
Menores de 18 anos só podem usar o app com consentimento e supervisão de pais ou responsáveis.

10. COOKIES E ARMAZENAMENTO LOCAL
Usado apenas para manter sua sessão e preferências (idioma).

11. TRANSFERÊNCIA INTERNACIONAL
Provedores podem operar fora do Brasil. Garantimos cláusulas contratuais com proteção equivalente à LGPD.

12. ALTERAÇÕES
Esta política pode ser atualizada; avisaremos no app.

13. CONTATO
privacidade@mandalariosurf.com$TXT$, true);
