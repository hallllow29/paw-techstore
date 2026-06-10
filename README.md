# paw-techstore

Plataforma de e-commerce para uma loja de **material informático**.
Trabalho prático de **Programação em Ambiente Web (PAW)** — Avaliação de Recurso.

Stack: **MongoDB · Express · Angular · Node (MEAN)** · JWT · Swagger.

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
