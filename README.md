<p align="center">
  <img src="./public/assets/img/obsyd-logo.svg" alt="Obsyd" width="320" />
</p>

<p align="center">
  Aplicação full-stack de finanças pessoais com autenticação, sessão HTTP-only e dados persistidos por usuário no Neon PostgreSQL.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-em%20desenvolvimento-f59e0b" alt="Status do projeto" />
  <img src="https://img.shields.io/badge/node-%3E%3D18-22c55e" alt="Node.js 18+" />
  <img src="https://img.shields.io/badge/database-Neon%20PostgreSQL-38bdf8" alt="Neon PostgreSQL" />
  <img src="https://img.shields.io/badge/deploy-Render-8b5cf6" alt="Deploy Render" />
</p>

## Sobre

O **Obsyd** é uma aplicação SaaS solo de organização financeira pessoal. O backend em Node.js serve uma SPA vanilla, autentica usuários com sessão em cookie HTTP-only e persiste o estado financeiro individual no PostgreSQL.

Funcionalidades atuais:

- cadastro, login, logout e sessão segura por cookie
- dashboard com saldo, receitas, despesas, investimentos, orçamento e insights
- transações com filtros, categorias customizáveis e exportação CSV
- metas, juros compostos, calendário financeiro, orçamentos, assinaturas, relatórios, alertas e backup JSON
- gráficos com Chart.js
- deploy preparado para Render

## Regras financeiras

O Obsyd usa uma regra única em todas as telas:

- **Receita:** entrada de dinheiro, como salário, freelance ou reembolso.
- **Despesa:** saída consumida, como alimentação, transporte, moradia e assinaturas.
- **Investimento:** aporte que sai do caixa disponível e aumenta o patrimônio investido.
- **Saldo disponível:** receitas - despesas - investimentos, considerando todo o histórico.
- **Economia do mês:** receitas - despesas.
- **Saldo líquido mensal:** receitas - despesas - investimentos.
- **Patrimônio financeiro estimado:** saldo disponível + total aportado em investimentos.
- **Taxa de poupança:** `(receitas - despesas) / receitas * 100`.

Exemplo validado para maio/2026:

- receitas: `R$ 2.500,00`
- despesas: `R$ 100,79`
- investimentos: `R$ 500,00`
- Alimentação: `R$ 70,79`
- Transporte: `R$ 30,00`
- saldo líquido mensal: `R$ 1.899,21`
- economia do mês/patrimônio estimado: `R$ 2.399,21`

## Stack

- **Frontend:** HTML, CSS, Tailwind via CDN e JavaScript vanilla
- **Backend:** Node.js puro com `http`
- **Banco:** Neon PostgreSQL via `pg`
- **Gráficos:** Chart.js
- **Testes:** `node:test`
- **Deploy:** Render

## Estrutura

- [server.js](/home/joao/code/projetos/obsyd/obsyd/server.js:1): servidor HTTP, API, autenticação, sessão, schema e persistência.
- [public/index.html](/home/joao/code/projetos/obsyd/obsyd/public/index.html:1): HTML principal da SPA.
- [public/assets/js/app.js](/home/joao/code/projetos/obsyd/obsyd/public/assets/js/app.js:1): renderização, navegação e interações da SPA.
- [public/assets/js/finance.js](/home/joao/code/projetos/obsyd/obsyd/public/assets/js/finance.js:1): regras financeiras compartilhadas e testáveis.
- [public/assets/css/styles.css](/home/joao/code/projetos/obsyd/obsyd/public/assets/css/styles.css:1): tokens e estilos visuais.
- [test/finance.test.js](/home/joao/code/projetos/obsyd/obsyd/test/finance.test.js:1): testes unitários dos cálculos financeiros.
- [render.yaml](/home/joao/code/projetos/obsyd/obsyd/render.yaml:1): blueprint para Render.

## Variáveis De Ambiente

Obrigatórias:

- `DATABASE_URL`: connection string do Neon/PostgreSQL.

Opcionais:

- `HOST`: padrão `0.0.0.0`.
- `PORT`: padrão `8000`.
- `NODE_ENV`: use `production` no Render para ativar cookie `Secure`.

## API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/bootstrap`
- `PUT /api/bootstrap`
- `GET /api/health`

Todas as queries sensíveis usam `user_id` derivado da sessão. O endpoint `/api/bootstrap` substitui o dataset financeiro do usuário autenticado.

## Desenvolvimento

```bash
npm install
npm run dev
```

Rodar testes:

```bash
npm test
```

## Deploy No Render

1. Crie um banco Neon e copie a connection string.
2. Configure `DATABASE_URL` no serviço Render.
3. Use `npm install` como build command.
4. Use `npm start` como start command.
5. Configure `NODE_ENV=production`.
6. Valide o deploy em `/api/health`.

## Próximos Passos

- endpoints granulares para transações, orçamentos, metas e assinaturas
- modelo próprio de categorias com cor, ícone, tipo e arquivamento
- edição de transações
- recorrências com geração controlada de transações
- importação CSV com preview e deduplicação
- testes de integração com isolamento por usuário
