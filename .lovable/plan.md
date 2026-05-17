Criar páginas públicas e admin para Política de Privacidade e Termos de Serviço.

## Banco de dados
- Criar tabela `privacy_policy` (mesma estrutura de `terms_of_service`)
- Versão ativa, título, conteúdo, timestamps

## Páginas públicas (acessíveis sem login)
- `/terms` — exibe versão ativa de `terms_of_service`
- `/privacy` — exibe versão ativa de `privacy_policy`
- Layout clean com logo e conteúdo formatado

## Admin
- Criar `AdminPrivacy.tsx` similar ao `AdminTerms.tsx`
- Adicionar rota `/admin/privacy` no menu admin

## Integração
- Adicionar rotas em `App.tsx`
- Adicionar links "Termos de Uso" e "Política de Privacidade" no rodapé da tela de login (`Auth.tsx`)
- Links acessíveis para usuários logados no menu de perfil ou footer