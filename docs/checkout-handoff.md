# Acesso do aplicativo ao checkout web

O novo fluxo aparece apenas na tela `/adquirir-aulas` dentro do aplicativo iOS.
A detecção exige evidência do shell nativo e da plataforma iOS; parâmetros da URL
ou flags antigas no storage do Safari, isoladamente, não ativam a interface.
O site no navegador e o app Android mantêm a interface anterior.

O cliente gera um link, depois abre o site ou copia o link para o Safari.
São dois gestos separados para preservar a permissão de abertura de
janelas e de escrita na área de transferência no iOS.

O link contém um ticket criptografado no fragmento `#ticket`. A função
`checkout-handoff` valida a sessão do app com `auth.getUser`, gera um OTP para o
e-mail confirmado dessa mesma conta e protege o OTP com AES-GCM. O ticket expira
em cinco minutos. O OTP é consumido pelo Supabase no resgate, impedindo reuso.
O navegador recebe uma sessão nova; os tokens do app não são compartilhados.
Gerar um novo link pode invalidar um link mágico anterior da mesma conta.

`/auth/checkout` remove o ticket da URL antes do resgate, aplica a sessão recebida
mesmo se houver outra conta aberta no Safari e segue para `/packages?checkout=1`.
Falhas de resgate exibem uma mensagem, sem prosseguir com a conta anterior.
Se o link abrir dentro da WebView, ele não é consumido: a página orienta abrir
no Safari. Não há garantia de abertura automática em binários antigos.

## Publicação e validação

1. Publicar a Edge Function `checkout-handoff` com `verify_jwt = false` conforme
   `supabase/config.toml`. O endpoint de criação verifica o bearer token no handler;
   o resgate é público e exige o ticket. Usar os segredos padrão do Supabase
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_ANON_KEY`.
2. Publicar o frontend compartilhado para disponibilizar o fluxo da WebView e a
   rota técnica `/auth/checkout`, acessada pelo link pessoal no Safari. As páginas
   normais do site mantêm a interface anterior.
   Aplicar também a migration `20261125131558_allow_public_active_class_packages.sql`
   para que o catálogo fique visível no Safari sem uma sessão autenticada.
3. No iPhone com o app da loja, gerar e copiar um link, abrir no Safari sem login
   e verificar a identidade e os créditos. Repetir com outra conta já aberta
   no Safari. Confirmar também rejeição de link usado e de link expirado.
4. Publicar o frontend e testar a abertura automática na build atual da loja.
   Sem bridge disponível, o botão preserva a navegação normal do link.
   Se o binário não interceptar o checkout, distribuir uma nova build com a
   correção em `mobile/checkoutLinks.ts`: `/auth/checkout` sai para o navegador
   antes da lista de origens permitidas na WebView, preservando o ticket e o
   pacote selecionado. `/auth/callback` permanece no login do aplicativo.
   Publicar só o site não altera esse tratamento nativo já instalado.
   Em builds antigas sem suporte, copiar e colar continua disponível.

Os testes locais cobrem autenticação de criação, isolamento de conta, adulteração,
expiração, tratamento de reuso e troca da sessão do navegador. O consumo atômico
real do OTP e o comportamento da build da loja precisam de validação integrada.

Referências: [generateLink](https://supabase.com/docs/reference/javascript/auth-admin-generatelink)
e [verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp).

## Compra pelo link público

O link `/packages?checkout=1` também funciona sem o ticket pessoal. Visitantes
podem consultar os pacotes ativos; a policy de leitura pública não permite
alterar pacotes nem acessar pagamentos. Sem login, o botão de compra leva a
`/auth?next=...` e preserva o pacote em `package`. Após entrar, o navegador
retorna ao Pix desse pacote. Com uma sessão válida, a compra segue diretamente.

O catálogo carrega independentemente do histórico. Falhas de consulta exibem
uma opção de tentar novamente, e um catálogo vazio tem uma mensagem própria.
Validar em produção após aplicar a migration: abrir o link no Safari sem login,
conferir os pacotes ativos, selecionar uma aula, entrar e conferir o pacote no
pagamento. Confirmar que visitantes não leem pagamentos nem pacotes inativos.
