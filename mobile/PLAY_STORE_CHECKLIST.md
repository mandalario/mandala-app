# Checklist pré-submissão — Google Play (Mandalario)

Use este guia na ordem. Marque cada item antes de enviar para **produção**.

**Referências do projeto**

| Item | Valor |
|------|--------|
| Pacote Android | `com.mandalario.app` |
| Nome na loja | Mandalario |
| WebView / site | `https://mandalario.vercel.app` |
| Política de privacidade | `https://mandalario.vercel.app/privacy` |
| Termos | `https://mandalario.vercel.app/terms` |
| EAS project ID | `e0d3b661-b855-4ca1-98d5-e65af5907953` |
| Canal de push (Android) | `mandalario-alerts` |

---

## 1. Antes do build (código e backend)

- [ ] Branch `app` commitada e push feita para o remoto.
- [ ] Site em produção no domínio do WebView (`EXPO_PUBLIC_WEB_URL`).
- [ ] Páginas `/privacy` e `/terms` acessíveis sem login.
- [ ] Migrations Supabase aplicadas no projeto de produção.
- [ ] Edge Functions publicadas:
  - [ ] `register-push-token`
  - [ ] `send-push-notification` (com validação de admin)
- [ ] Conta Expo/EAS com acesso ao projeto acima.

### FCM (obrigatório para push no Android de loja)

1. Criar projeto no [Firebase Console](https://console.firebase.google.com/).
2. Adicionar app Android com pacote `com.mandalario.app`.
3. Em [Expo → Credentials](https://expo.dev) → Android → **FCM V1** → enviar JSON da service account do Firebase.
4. Sem FCM, o app instala, mas push em produção pode falhar.

---

## 2. Build do AAB (EAS)

Na pasta `mobile/`:

```bash
cd mobile
npm install
npx expo-doctor
eas build -p android --profile production
```

- [ ] `expo-doctor` com **21/21** checks.
- [ ] Build `production` concluído (gera **.aab**, não APK).
- [ ] `versionCode` incrementado automaticamente (`autoIncrement` no `eas.json`).

### Teste interno antes da loja pública

```bash
eas build -p android --profile preview
# ou use o AAB de production na faixa internal (abaixo)
```

---

## 3. Play Console — criar o app

1. [Google Play Console](https://play.google.com/console) → **Criar app**.
2. Preencher:
   - [ ] Nome: **Mandalario**
   - [ ] Idioma padrão: Português (Brasil)
   - [ ] App ou jogo: **App**
   - [ ] Gratuito ou pago: conforme seu modelo
3. Aceitar declarações de políticas da Google.

---

## 4. Painel “Presença na loja”

### Ficha da loja (obrigatório)

- [ ] **Nome curto** e **descrição completa** (o que o app faz: aulas de surf, agenda, pagamentos, avisos).
- [ ] **Ícone** 512×512 (use `mobile/assets/icon.png` exportado em alta resolução se necessário).
- [ ] **Gráfico de recursos** 1024×500.
- [ ] **Capturas de tela** (mín. 2 telefones):
  - Login / home do aluno
  - Agenda ou pacotes
  - Perfil ou notificações
- [ ] **Categoria**: Esportes ou Educação (escolha a mais fiel).
- [ ] **E-mail de contato** do desenvolvedor (visível na loja).
- [ ] **Site** (opcional): `https://mandalario.vercel.app`

### Política de privacidade (obrigatório)

- [ ] URL: `https://mandalario.vercel.app/privacy`
- [ ] Deve abrir em navegador sem erro 404.
- [ ] Mencionar: conta, e-mail, telefone, pagamentos, tokens de push, cookies/localStorage do WebView.

---

## 5. App content (conteúdo do app)

| Seção | O que declarar |
|--------|----------------|
| **Política de privacidade** | URL acima |
| **Anúncios** | Não contém anúncios (se for o caso) |
| **Classificação de conteúdo** | Questionário IARC (geralmente **Livre** / baixa intensidade) |
| **Público-alvo** | 13+ ou 18+ conforme cadastro real de alunos |
| **App access** | Se exige login: fornecer **conta de teste** (e-mail + senha) para o revisor |
| **Notícias** | Não é app de notícias |
| **COVID / saúde** | Não aplicável, salvo se mudar escopo |
| **Data safety** | Ver seção 6 |

### Conta de teste para o revisor (recomendado)

Criar aluno aprovado no admin, por exemplo:

- E-mail: `reviewer@mandalario.app` (ou similar)
- Senha: forte, exclusiva para revisão
- Status: **approved**, perfil completo

Incluir na ficha **App access** → “Todas as funcionalidades exigem login” → credenciais de teste.

---

## 6. Data safety (segurança dos dados)

Responda com base no que o app **realmente** coleta via WebView + Supabase + push.

### Dados coletados (marque se aplicável)

| Tipo | Coletado? | Finalidade | Compartilhado? |
|------|-----------|------------|----------------|
| Nome | Sim | Conta / perfil | Não (ou só processadores: Supabase, Mercado Pago se usar) |
| E-mail | Sim | Login, comunicação | Idem |
| Telefone | Sim | Cadastro / contato | Idem |
| IDs de dispositivo / push token | Sim | Notificações | Expo push service |
| Informações de pagamento | Se MP integrado | Pagamento de pacotes | Mercado Pago |
| Fotos (avatar) | Se upload | Perfil | Supabase Storage |
| Localização | **Não** (bloqueada no app nativo) | — | — |
| Contatos / câmera / microfone | **Não** | — | — |

### Práticas de segurança

- [ ] Dados criptografados em trânsito (HTTPS).
- [ ] Usuário pode solicitar exclusão de conta (descrever processo ou link de contato).
- [ ] Dados opcionais vs obrigatórios coerentes com o cadastro.

### Push notifications

- [ ] Declarar coleta de **identificadores do dispositivo** ou **outros IDs** para push.
- [ ] Finalidade: **funcionalidade do app** (avisos de aula/mensagens).
- [ ] Não usar para publicidade, salvo se mudar a política.

---

## 7. Permissões Android (alinhar com o app)

O build bloqueia permissões sensíveis não usadas. Na revisão, o app deve pedir apenas:

- [ ] **Internet** (implícito)
- [ ] **POST_NOTIFICATIONS** (Android 13+) — só após login, quando o web pede `GET_PUSH_TOKEN`

**Não** deve pedir: câmera, microfone, localização, contatos, armazenamento (salvo mudança futura).

Se o Play Console listar permissões extras, confira dependências e rode novo build após `blockedPermissions` em `app.json`.

---

## 8. Enviar o AAB

### Opção A — EAS Submit

```bash
cd mobile
eas submit -p android --profile production --latest
```

### Opção B — Upload manual

Play Console → **Testar e publicar** → **Teste interno** (ou Produção) → **Criar nova versão** → enviar `.aab`.

- [ ] Faixa **Teste interno** primeiro (recomendado).
- [ ] Adicionar testadores (e-mails Google) na lista interna.
- [ ] Instalar, testar login, navegação, push após login.

---

## 9. Testes obrigatórios antes de produção

Execute em **dispositivo físico** com build de loja (não Expo Go):

- [ ] App abre e carrega `https://mandalario.vercel.app`.
- [ ] Login e logout funcionam.
- [ ] Links externos (ex.: pagamento MP) abrem no navegador; voltar ao app ok.
- [ ] Botão voltar Android navega no histórico do WebView.
- [ ] Após login, permissão de notificação aparece (não no primeiro frame).
- [ ] Admin envia push → chega no celular do aluno.
- [ ] Toque na notificação abre rota correta no app.
- [ ] `/privacy` acessível pelo site.
- [ ] Sem crashes em cold start e após revogar permissão de notificação.

---

## 10. Publicação

Ordem sugerida:

1. **Teste interno** → validar 1–3 dias.
2. **Teste fechado** (opcional, beta).
3. **Produção** → enviar para revisão.

Na submissão:

- [ ] Notas da versão em português (o que há de novo).
- [ ] Confirmar que não há conteúdo enganoso (app não se passa por WhatsApp/outras marcas).
- [ ] Confirmar que o app não é só um “wrapper” vazio — descrever funcionalidades reais (aulas, agenda, chat, pagamentos).

Tempo de revisão: em geral **alguns dias**; pode pedir ajustes em política, Data safety ou conta de teste.

---

## 11. Problemas comuns de reprovação

| Motivo | Solução |
|--------|---------|
| Política de privacidade inválida | Corrigir URL `/privacy` e conteúdo |
| Data safety inconsistente | Alinhar com Supabase/MP/push |
| App não abre / tela branca | `EXPO_PUBLIC_WEB_URL` errado no build EAS |
| Login impossível para revisor | Conta de teste em App access |
| Permissões excessivas | Novo build com `blockedPermissions` |
| Push não funciona | FCM no Expo + login + token registrado |
| Impersonação / marca | Não usar “WhatsApp” em textos de canal (já renomeado para Mandalario) |
| Target API baixo | `targetSdkVersion: 35` em `app.json` |

---

## 12. Comandos rápidos (referência)

```bash
# Validar projeto
cd mobile && npx expo-doctor

# Build loja
eas build -p android --profile production

# Enviar à Play (internal track no eas.json)
eas submit -p android --profile production --latest

# Deploy functions (na raiz do repo, com Supabase CLI)
supabase functions deploy register-push-token
supabase functions deploy send-push-notification
```

---

## 13. Após aprovação

- [ ] Monitorar **Android vitals** (crashes, ANRs).
- [ ] Responder avaliações na loja.
- [ ] Para cada release: novo `eas build` + nova versão na Play Console.
- [ ] Manter política de privacidade atualizada se coletar novos dados.
