# Obsyd + Neon

Versão full-stack da Obsyd com persistência real em **Neon PostgreSQL**, autenticação real com senha hash, layout ajustado para desktop e celular e dados isolados por usuário.

## O que entrou nesta versão

- Persistência em **Neon/PostgreSQL**
- Login e cadastro reais conectados ao banco online
- Sessão real por token
- Bootstrap e sincronização da SPA usando o banco
- Sidebar corrigida e contida dentro do layout
- Sidebar com altura máxima da tela e navegação interna rolável
- Melhor responsividade mobile
- Mesmas funcionalidades da versão dark refresh

## Stack

- Frontend: HTML, Tailwind via CDN, CSS customizado e JavaScript vanilla
- Backend: Node.js puro com `http`
- Banco: Neon PostgreSQL via `pg`
- Gráficos: Chart.js via CDN

## Estrutura

- `server.js`: servidor HTTP, API, sessão e persistência no Neon
- `package.json`: scripts e dependências
- `public/`: SPA e assets
- `.env.example`: modelo para sua connection string do Neon
- `render.yaml`: deploy pronto no Render
- `Procfile`: start simples para PaaS
- `Dockerfile`: imagem pronta para deploy containerizado

## Variáveis de ambiente

Crie sua variável `DATABASE_URL` com a connection string do Neon.
O servidor também lê automaticamente um arquivo `.env` na raiz do projeto.

Exemplo em `.env.example`:

- `DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require`
- `HOST=0.0.0.0`
- `PORT=8000`

## API

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/bootstrap`
- `PUT /api/bootstrap`
- `GET /api/health`

## Login

O acesso agora funciona com cadastro e login reais:

- crie sua conta com nome, e-mail e senha
- use o mesmo e-mail e senha para voltar depois
- cada usuário começa com o ambiente zerado e salva seu próprio histórico

## Rodando localmente

### Requisito

- Node.js 18+

### Instalação

- `npm install`
- defina `DATABASE_URL`
- `npm start`

Depois abra:

- `http://127.0.0.1:8000`

## Deploy

### Render

- conecte o repositório
- o projeto já inclui `render.yaml`
- adicione a variável `DATABASE_URL`
- deploye normalmente

### Railway

- suba o projeto
- defina `DATABASE_URL`
- start command: `npm start`

### Docker

- defina `DATABASE_URL`
- build e execute a imagem normalmente

## Observações

- O endpoint `/api/health` acusa erro enquanto `DATABASE_URL` não estiver configurada.
- A aplicação continua sendo uma SPA com fallback do servidor para as rotas do frontend.
- O banco é inicializado automaticamente no primeiro start com as tabelas necessárias.
