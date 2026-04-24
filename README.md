<p align="center">
  <img src="./public/assets/img/obsyd-logo.svg" alt="Obsyd" width="320" />
</p>

<p align="center">
  Plataforma de organização financeira pessoal com autenticação real, persistência no Neon e interface dark-first.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-em%20desenvolvimento-f59e0b" alt="Status do projeto" />
  <img src="https://img.shields.io/badge/node-%3E%3D18-22c55e" alt="Node.js 18+" />
  <img src="https://img.shields.io/badge/database-Neon%20PostgreSQL-38bdf8" alt="Neon PostgreSQL" />
  <img src="https://img.shields.io/badge/deploy-Render-8b5cf6" alt="Deploy Render" />
</p>

## Sobre

O **Obsyd** é uma aplicação full-stack de finanças pessoais construída em Node.js, com frontend SPA servido pelo próprio backend e dados persistidos no **Neon PostgreSQL**.

Hoje o projeto entrega:

- autenticação real com cadastro, login e senha com hash
- sessão por cookie HTTP-only
- dashboard com métricas, gráfico de fluxo e agenda semanal
- transações, metas, juros compostos, orçamentos, assinaturas, relatórios e alertas
- categorias customizáveis e orçamento por categoria
- persistência individual por usuário no banco

## Stack

- **Frontend:** HTML, Tailwind via CDN, CSS customizado e JavaScript vanilla
- **Backend:** Node.js puro com `http`
- **Banco:** Neon PostgreSQL via `pg`
- **Gráficos:** Chart.js
- **Deploy recomendado:** Render

## Estrutura

- [server.js](/home/joao/code/projetos/finflow-spa-dark-refresh/server.js:1): servidor HTTP, API, autenticação, sessão e persistência
- [public/](/home/joao/code/projetos/finflow-spa-dark-refresh/public): SPA, assets, favicon e branding
- [render.yaml](/home/joao/code/projetos/finflow-spa-dark-refresh/render.yaml:1): blueprint para deploy no Render
- [Dockerfile](/home/joao/code/projetos/finflow-spa-dark-refresh/Dockerfile:1): imagem pronta para container
- [Procfile](/home/joao/code/projetos/finflow-spa-dark-refresh/Procfile:1): start simples para plataformas compatíveis

```

## API principal

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/bootstrap`
- `PUT /api/bootstrap`
- `GET /api/health`

## Roadmap

- [x] Rebrand completo para Obsyd
- [x] Autenticação real com senha hash
- [x] Sessão com cookie HTTP-only
- [x] Persistência 100% no banco por usuário
- [x] Dashboard com agenda semanal
- [x] Categorias customizáveis e orçamento por categoria
- [x] Calendário responsivo e layout mobile refinado
- [ ] Edição de transações existentes
- [ ] Exclusão e edição de categorias com regras de reassociação
- [ ] Configurações de perfil mais completas
- [ ] Melhorias de acessibilidade e navegação por teclado
- [ ] Pipeline de deploy e ambiente de staging

## Observações

- O endpoint `/api/health` é o melhor lugar para validar se o deploy está de pé.
- O Neon precisa estar configurado corretamente antes do primeiro start em produção.
- Como a sessão usa cookie HTTP-only, não há dependência de `localStorage` para autenticação.

## Autor

Desenvolvido por **João Araujo**.
