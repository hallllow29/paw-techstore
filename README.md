# paw-techstore

[![CI](https://github.com/hallllow29/paw-techstore/actions/workflows/ci.yml/badge.svg)](https://github.com/hallllow29/paw-techstore/actions/workflows/ci.yml)
[![Security](https://github.com/hallllow29/paw-techstore/actions/workflows/security.yml/badge.svg)](https://github.com/hallllow29/paw-techstore/actions/workflows/security.yml)

Plataforma de e-commerce para uma loja de **material informático**.
Trabalho prático de **Programação em Ambiente Web (PAW)** — Avaliação de Recurso.

Stack: **MongoDB · Express · Angular · Node (MEAN)** · JWT · Swagger.
Produto: **ElSircários Tech Store**.

## Funcionalidades

### Cliente

- Registo com **confirmação de email obrigatória**; login por password **ou OTP** (código por email/SMS)
- Catálogo com pesquisa, filtros (categoria, marca, preço, stock), autocomplete e comparador
- Carrinho, checkout com moradas guardadas, cupões de desconto e favoritos
- Pagamento: **PayPal** (sandbox real), cartão (Stripe opcional), MB WAY, Multibanco, à entrega
- Acompanhamento da encomenda em tempo real (mapa do estafeta) e avaliações de produto/entrega

### Loja

- Gestão de produtos (CRUD com imagens), categorias, cupões e definições da loja
- Gestão de encomendas (máquina de estados) e **painel de análise** (receita, ticket médio, top produtos, alertas de stock)

### Estafeta

- Aceitar e concluir entregas; envio da posição em tempo real (Socket.IO)

### Admin

- **Observabilidade** da plataforma (KPIs, tendências, distribuições, recentes)
- Gestão de utilizadores: aprovar/rejeitar estafetas e **suspender/reativar** contas

### Transversal

- Tema **claro/escuro**, notificações em tempo real (com som), design responsivo
- Segurança: JWT + bcrypt, rate-limiting, validação (express-validator), política de password forte, Swagger

## Estrutura do monorepo

```
paw-techstore/
├── api/                # API REST (Node + Express + Mongoose) — padrão MVC
│   └── src/
│       ├── config/     # env, ligação à BD, swagger
│       ├── models/     # schemas Mongoose
│       ├── controllers/# lógica das rotas
│       ├── routes/      # definição de endpoints (+ anotações Swagger)
│       ├── middleware/ # auth, erros, 404, uploads
│       ├── services/   # regras de negócio
│       └── seed/        # dados de demonstração
├── client/             # SPA Angular
├── devsecops/          # SonarQube + DefectDojo + relatórios
├── .github/workflows/  # CI + Security (DevSecOps)
└── docs/               # relatório, diagramas, mockups
```

## Pré-requisitos

- **Node.js** ≥ 20 e **npm**
- **Angular CLI** (`npm i -g @angular/cli`)
- Uma base de dados **MongoDB** — uma das opções:
  - **MongoDB Atlas** (cloud, sem instalar nada) — usado na entrega
  - **Docker** (Mongo em container) — recomendado para desenvolvimento

## Configuração

A aplicação **nunca tem credenciais hardcoded** — tudo vem de variáveis de
ambiente. Copia o exemplo e preenche:

```bash
cp api/.env.example api/.env
```

Define `MONGODB_URI` no `.env`:

- Atlas: `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/paw-techstore`
- Docker/local: `mongodb://127.0.0.1:27017/paw-techstore`

### Variáveis opcionais

Tudo funciona em **modo simulado** sem configuração. Preenche o `.env` só para
ativar integrações reais (ver `api/.env.example`):

| Variável                                 | Para quê                                                            |
| ---------------------------------------- | ------------------------------------------------------------------- |
| `SMTP_HOST/PORT/USER/PASS`, `MAIL_FROM`  | Email real (ex.: Brevo, Gmail). Sem isto, preview Ethereal nos logs |
| `PAYPAL_CLIENT_ID/SECRET`, `PAYPAL_MODE` | Checkout PayPal real (sandbox). Sem isto, PayPal fica simulado      |
| `STRIPE_SECRET_KEY`                      | Cartão via Stripe. Sem isto, cartão fica simulado                   |
| `SMS_PROVIDER`, `SMS_*`                  | SMS real. Sem isto, OTP por SMS fica simulado (código nos logs)     |
| `JWT_SECRET`, `JWT_EXPIRES_IN`           | Segredo e validade do token JWT                                     |

## Como correr

### Opção A — Docker (tudo de uma vez, offline)

```bash
docker compose up --build
# Cliente:  http://localhost:8080
# API:      http://localhost:3000
# Swagger:  http://localhost:3000/api/docs
```

### Opção B — manual (dois terminais)

```bash
# Terminal 1 — API
cd api && npm install && npm run dev

# Terminal 2 — Cliente
cd client && npm install && npm start   # http://localhost:4200
```

### Popular a base de dados (dados de demonstração)

```bash
cd api && npm run seed
```

### Contas de demonstração

Todas com a password **`demo1234`**:

| Papel    | Email              |
| -------- | ------------------ |
| Admin    | `admin@paw.pt`     |
| Loja     | `loja@paw.pt`      |
| Estafeta | `estafeta1@paw.pt` |
| Cliente  | `ana@paw.pt`       |
| Cliente  | `rui@paw.pt`       |

> Os clientes também podem entrar por **código OTP**. Em desenvolvimento (sem
> SMTP/SMS real) o código aparece nos **logs da API**.

## Scripts úteis (API)

| Comando                 | Faz                                 |
| ----------------------- | ----------------------------------- |
| `npm run dev`           | API com auto-reload                 |
| `npm start`             | API em modo normal                  |
| `npm test`              | Testes (node:test)                  |
| `npm run test:coverage` | Testes + cobertura (lcov)           |
| `npm run lint`          | ESLint (inclui regras de segurança) |
| `npm run format`        | Prettier                            |
| `npm run seed`          | Popula a BD                         |

## Testes

```bash
cd api && npm test               # API — node:test + mongodb-memory-server (51 testes)
cd api && npm run test:coverage  # API — cobertura (c8 / lcov)
cd client && npm test            # Cliente — Vitest (serviços, guards, utils)
```

Cobrem autenticação (registo/login/OTP/confirmação de email), encomendas
(stock atómico, estados, cancelamento), pagamentos, avaliações e notificações
no backend; e sessão, carrinho, tema, força de password e guards no frontend.

## Qualidade & Segurança (DevSecOps)

CI/CD via **GitHub Actions** (`.github/workflows/`):

- **`ci.yml`** — lint, formatação, testes + cobertura, build do cliente
- **`security.yml`** — Gitleaks · TruffleHog · Semgrep · Trivy ·
  OWASP Dependency-Check · OWASP ZAP · Syft (SBOM)

Pre-commit (Husky) formata o código e procura segredos antes de cada commit.
Agregação de vulnerabilidades em **DefectDojo** e qualidade em **SonarQube** —
ver [`devsecops/README.md`](devsecops/README.md).

## Entrega

```bash
# Gera o zip de entrega (sem node_modules)
git archive --format=zip -o PAW_<nr_aluno>.zip HEAD
```

> A pasta `node_modules` é sempre omitida (`.gitignore`). O professor só precisa
> de `npm install` em `api/` e `client/`, e de um `MONGODB_URI` válido.
