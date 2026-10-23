# Checklist pré-submissão — Apple App Store (Mandalario)

Use este guia passo a passo antes de enviar o seu app iOS para a **App Store**.

**Referências do projeto**

| Item | Valor |
|------|--------|
| Bundle Identifier | `com.mandalario.app` |
| Nome na loja | Mandalario |
| WebView / site | `https://mandalario.app` |
| Política de privacidade | `https://mandalario.app/privacy` |
| EAS project ID | `e0d3b661-b855-4ca1-98d5-e65af5907953` |
| Push notifications | APNs (configurado via EAS) |

---

## 1. Pontos Críticos e Cuidados Importantes (Evite Rejeições da Apple)

A Apple possui políticas de revisão muito mais rígidas que a Google Play. Fique atento a estes pontos principais:

### ⚠️ A. Login Social vs Sign in with Apple (Diretriz 4.8)
* **Regra da Apple:** Se o seu site (`https://mandalario.app`) carregado dentro da WebView oferecer **qualquer login social/terceiros** (como Google, Facebook, etc.), a Apple **exige** que você também ofereça o **Sign in with Apple** (iniciar sessão com a Apple) como opção equivalente.
* **O que fazer:** Se você usa apenas login por e-mail e senha tradicionais, está tudo certo. Se usa Google OAuth no site, adicione também o login com a Apple no seu front-end web.

### ⚠️ B. Transparência no Ícone do App (`icon.png`)
* **Regra da Apple:** O ícone do app para iOS não pode conter canal de transparência (canal Alpha). Se contiver, o build será rejeitado no upload ou processamento pela Apple.
* **O que fazer:** Verifique se o arquivo em `mobile/assets/icon.png` (1024x1024) possui fundo totalmente opaco (sólido). Se necessário, remova o canal Alpha usando ferramentas de imagem ou exportando como PNG de 24 bits sem transparência.

### ⚠️ C. Suporte a Tablets (`supportsTablet: true`)
* **Situação:** No arquivo `app.json`, a chave `"supportsTablet": true` está ativa.
* **Regra da Apple:** Se o suporte a tablets estiver ativo, você **deve fornecer capturas de tela obrigatórias para iPad** (iPad Pro de 12.9 polegadas de 2ª e 3ª geração/gerações mais novas) na ficha técnica da App Store.
* **Recomendação:** Se o app é um WebView otimizado principalmente para celulares e você não quer ter que tirar capturas de tela de iPad (ou o layout não se adapta perfeitamente), altere `"supportsTablet": false` no `app.json` antes do build.

### ⚠️ D. Domínios Associados (Universal Links)
* **Situação:** O seu `app.json` declara:
  ```json
  "associatedDomains": [
    "applinks:mandalario.app"
  ]
  ```
* **O que fazer:** Para que os Universal Links funcionem no iOS, você precisa hospedar o arquivo Apple App Site Association (AASA) sem extensão em:
  `https://mandalario.app/.well-known/apple-app-site-association`
  Se você não planeja usar Universal Links (abrir o app automaticamente ao clicar em links do site), é altamente recomendado remover a chave `associatedDomains` para evitar avisos ou problemas de configuração de domínio no painel da Apple.

### ⚠️ E. Serviços Físicos e Pagamentos (Diretriz 3.1.3(e))
* **Regra da Apple:** O app não vende bens digitais ou assinaturas in-app. Trata-se de **aulas práticas presenciais de surf** na praia. Pela Diretriz 3.1.3(e), serviços físicos consumidos fora do app **devem** ser pagos externamente e não usam Apple In-App Purchase.
* **Texto obrigatório para colar nas "Notas de Revisão" (App Review Information) do App Store Connect:**
  > *"Reviewer Note: Mandalario is the official student management application for the physical, in-person surf school Mandala Rio Surf School based at Praia do Arpoador, Rio de Janeiro, Brazil. All surf classes and equipment rentals are physical, real-world sports activities conducted outdoors on the beach with certified instructors. In accordance with Apple App Store Review Guideline 3.1.3(e) (Goods and Services Outside of the App), these physical services are consumed outside of the app and do not use in-app purchases. No digital content, in-app features, or digital goods are unlocked by purchases."*

---

## 2. Antes do Build (Preparação)

- [ ] Certificar-se de ter uma **Apple Developer Account** ativa ($99/ano).
- [ ] O site de produção (`https://mandalario.app`) deve estar no ar.
- [ ] Criar uma **conta de teste** de aluno no banco de dados para os revisores da Apple (ex: `apple-reviewer@mandalario.app` / senha de teste). A Apple **vai rejeitar** o app se não conseguir passar da tela de login.
- [ ] Rodar `npx expo-doctor` e certificar-se de que todos os **21/21** checks estão passando (já corrigimos os pacotes desatualizados!).
- [ ] Rodar `npx tsc --noEmit` para garantir que o TypeScript compila sem erros (erro do `absoluteFill` já corrigido!).

---

## 3. Rodando o Build de Produção com EAS

Na pasta `mobile/`:

```bash
eas build -p ios --profile production
```

### O que acontece durante o primeiro build:
1. **Login na Apple:** O EAS CLI solicitará suas credenciais da conta de desenvolvedor da Apple (Apple ID).
2. **Criação Automática de Certificados:** O EAS perguntará se você quer que ele gerencie as credenciais de assinatura. Responda **Sim (Y)**. Ele criará automaticamente:
   - O identificador do App (App ID) no portal da Apple.
   - O certificado de distribuição de iOS.
   - O perfil de provisionamento (Provisioning Profile).
   - O registro do dispositivo de build se aplicável.
3. **Fase de Compilação:** O build será enviado para os servidores da Expo e compilado na nuvem. Ao terminar, você receberá um arquivo `.ipa` (ou o link direto dele no console Expo).

---

## 4. Criando o App no App Store Connect

1. Acesse o [App Store Connect](https://appstoreconnect.apple.com/).
2. Vá em **Meus Apps** e clique no botão **"+"** → **Novo App**.
3. Preencha os detalhes:
   - **Plataformas:** iOS
   - **Nome:** Mandalario (ou nome oficial)
   - **Idioma Principal:** Português (Brasil)
   - **ID do Pacote (Bundle ID):** Selecione `com.mandalario.app` da lista.
   - **SKU:** Um identificador exclusivo (ex: `mandalario-ios-app`).
   - **Acesso ao Usuário:** Conforme desejado (Acesso total).

---

## 5. Submetendo o Build para a App Store (TestFlight ou Produção)

### Opção A — EAS Submit (Recomendada e automática)

Para enviar o build gerado diretamente para o App Store Connect (TestFlight):

```bash
eas submit -p ios --profile production --latest
```

*O EAS pedirá uma chave API da Apple Developer ou suas credenciais de login para realizar o upload automático.*

### Opção B — Upload Manual via Transporter
1. Baixe o app **Transporter** na Mac App Store.
2. Faça download do arquivo `.ipa` gerado pelo EAS Build.
3. Arraste o arquivo `.ipa` para dentro do Transporter e clique em **Entregar (Deliver)**.

---

## 6. Preenchendo a Ficha técnica na App Store

No console do App Store Connect, preencha todas as abas obrigatórias:

* [ ] **Capturas de Tela:**
  - Mínimo de 3 prints para iPhones de **6.5 polegadas** (iPhone Xs Max, 11 Pro Max, etc.).
  - Mínimo de 3 prints para iPhones de **5.5 polegadas** (iPhone 8 Plus, 7 Plus, etc.).
  - *(Se `"supportsTablet": true` no app.json)*: Prints de iPad Pro de 12.9 polegadas.
* [ ] **Descrição do App:** Detalhar claramente o objetivo do app (agendamento de aulas de surf, gerenciamento de horários para alunos da Mandala Rio Surf School, avisos).
* [ ] **Palavras-chave (Keywords):** surf, mandala, rio, aula, escola, agendamento, etc.
* [ ] **URL de Suporte:** Link de contato ou ajuda (ex: `https://mandalario.app/contact` ou o site principal).
* [ ] **URL de Termos de Uso:** Opcional, mas recomendado (ex: `https://mandalario.app/terms`).
* [ ] **Política de Privacidade:** Obrigatório (URL: `https://mandalario.app/privacy`).
* [ ] **Classificação Etária (Age Rating):** Responder ao questionário de conteúdo.
* [ ] **Informações de Início de Sessão (App Access):** Marcar "Iniciar sessão é necessário" e informar o e-mail e senha da conta de teste criada para o revisor.

---

## 7. Testando no TestFlight (Antes de publicar para todos)

1. Assim que o upload for concluído e processado pela Apple (você receberá um e-mail), acesse a aba **TestFlight** no App Store Connect.
2. Adicione a si mesmo e a outros membros da equipe como **Testadores Internos** (Users and Access → TestFlight Users).
3. Baixe o app **TestFlight** no seu iPhone.
4. Aceite o convite e instale o app.
5. **Verifique:**
   - O app abre corretamente e carrega a WebView?
   - O login funciona?
   - O prompt pedindo autorização para notificações é exibido após o login (e não imediatamente ao abrir o app)?
   - O recebimento de notificações push está funcionando?

---

## 8. Publicação para Revisão Geral

1. Na aba **iOS App (1.0.0 Preparando para envio)**, role até a seção **Build** e clique em **"+"** para selecionar o build carregado do TestFlight.
2. Salve e clique em **Enviar para Revisão da App Store**.
3. O status mudará para *Aguardando Revisão*. Esse processo costuma levar entre 24 e 48 horas.
