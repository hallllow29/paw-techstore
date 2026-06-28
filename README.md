# ElSircários Tech Store

[![CI](https://github.com/hallllow29/paw-techstore/actions/workflows/ci.yml/badge.svg)](https://github.com/hallllow29/paw-techstore/actions/workflows/ci.yml)
[![Security](https://github.com/hallllow29/paw-techstore/actions/workflows/security.yml/badge.svg)](https://github.com/hallllow29/paw-techstore/actions/workflows/security.yml)

Loja online de material informático (computadores, periféricos e componentes),
feita para a unidade curricular de Programação em Ambiente Web (PAW), época de
recurso.

Stack MEAN: MongoDB, Express, Angular e Node.js. A autenticação é por JWT, a API
está documentada em Swagger e há comunicação em tempo real com Socket.IO.

## O que faz

A plataforma tem quatro perfis de utilizador, cada um com a sua área.

### Cliente

- Conta com confirmação de email obrigatória. O login pode ser por password ou
  por código OTP enviado por email ou SMS.
- Catálogo com pesquisa, filtros (categoria, marca, preço, stock) e comparador
  de produtos.
- Carrinho, checkout com moradas guardadas, cupões e favoritos.
- Pagamento por PayPal (sandbox real), cartão via Stripe (opcional), MB WAY,
  Multibanco ou pagamento à entrega.
- Acompanha a encomenda ao vivo, com o mapa do estafeta, e avalia depois de
  confirmar que recebeu.

### Loja

- CRUD de produtos com upload de imagens, gestão de categorias e de cupões, e as
  definições da loja (logótipo, horário, métodos de entrega e custos).
- Gestão das encomendas ao longo dos vários estados e um painel de análise com
  receita, ticket médio, produtos mais vendidos e alertas de stock.

### Estafeta

- Vê as entregas disponíveis e aceita uma de cada vez. Pode recusar uma entrega
  indicando o motivo, e nesse caso a loja reatribui a outro estafeta.
- Quando entrega, regista a entrega; a sua posição vai sendo enviada em tempo
  real durante o percurso. A entrega só fecha quando o cliente confirma a receção.

### Administrador

- Indicadores gerais da plataforma e gestão de utilizadores: aprovar ou rejeitar
  estafetas e suspender ou reativar contas.
- Registo de auditoria das ações sensíveis (aprovações, suspensões, bloqueios).

### Comum a todos

- Tema claro e escuro, notificações em tempo real e layout responsivo.
- Quando uma encomenda muda de estado, os painéis do cliente, da loja e do
  estafeta atualizam-se logo, sem ser preciso recarregar a página.

## Como correr

Precisas de Node.js 20 ou superior e de uma base de dados MongoDB (Atlas na
cloud, ou um container Docker para desenvolvimento).

### Com Docker (sobe tudo de uma vez)

```bash
docker compose up --build
# Cliente:  http://localhost:8080
# API:      http://localhost:3000
# Swagger:  http://localhost:3000/api/docs
```

### À mão (dois terminais)

```bash
# Terminal 1: API
cd api && npm install && npm run dev

# Terminal 2: cliente
cd client && npm install && npm start   # http://localhost:4200
```

### Dados de exemplo

```bash
cd api && npm run seed
```

### Contas de teste

Todas com a password `demo1234`:

| Perfil   | Email              |
| -------- | ------------------ |
| Admin    | `admin@paw.pt`     |
| Loja     | `loja@paw.pt`      |
| Estafeta | `estafeta1@paw.pt` |
| Cliente  | `ana@paw.pt`       |
| Cliente  | `rui@paw.pt`       |

Os clientes também podem entrar por código OTP. Em desenvolvimento, como não há
SMTP nem SMS configurados, o código aparece nos logs da API (nunca na resposta
HTTP).

## Configuração

As credenciais não estão no código, vêm todas de variáveis de ambiente. Copia o
ficheiro de exemplo e preenche o que precisares:

```bash
cp api/.env.example api/.env
```

A única variável obrigatória é a ligação à base de dados:

- Atlas: `MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/paw-techstore`
- Local ou Docker: `MONGODB_URI=mongodb://127.0.0.1:27017/paw-techstore`

O resto é opcional. Sem essas variáveis, o email, o PayPal, o Stripe e os SMS
correm em modo simulado, o que chega para testar tudo.

| Variável                                 | Para quê                                    |
| ---------------------------------------- | ------------------------------------------- |
| `SMTP_HOST/PORT/USER/PASS`, `MAIL_FROM`  | Envio real de email (ex.: Brevo, Gmail)     |
| `PAYPAL_CLIENT_ID/SECRET`, `PAYPAL_MODE` | Checkout PayPal real (sandbox)              |
| `STRIPE_SECRET_KEY`                      | Pagamento por cartão via Stripe             |
| `SMS_PROVIDER`, `SMS_*`                  | Envio real de SMS para o OTP                |
| `JWT_SECRET`, `JWT_EXPIRES_IN`           | Segredo e validade do token de autenticação |

## Testes

```bash
cd api && npm test               # 67 testes (node:test, supertest, mongodb-memory-server)
cd api && npm run test:coverage  # cobertura com c8; a build falha se descer dos limiares
cd client && npm test            # 24 testes (Vitest)
cd client && npm run e2e         # testes end-to-end no browser (Playwright)
```

No backend cobrem a autenticação (registo, login, OTP, confirmação de email),
as encomendas (stock atómico, transições de estado, cancelamento, recusa e
confirmação de entrega), os pagamentos, as avaliações e as notificações. No
frontend cobrem o carrinho, a sessão, os guards de rota e o tema.

## Segurança e qualidade

Há dois workflows no GitHub Actions:

- `ci.yml`: lint, formatação, testes com cobertura e build do cliente.
- `security.yml`: Gitleaks, TruffleHog, Semgrep, Trivy, OWASP Dependency-Check,
  OWASP ZAP e Syft (para o SBOM).

Antes de cada commit, o Husky formata o código e procura segredos. As
vulnerabilidades são agregadas no DefectDojo e a qualidade é medida no
SonarQube (ver [`devsecops/README.md`](devsecops/README.md)).

Na própria aplicação: passwords com bcrypt, tokens JWT, rate limiting, bloqueio
de conta ao fim de cinco tentativas de login falhadas, validação de input com
express-validator e o tal registo de auditoria das ações de administração.

## Estrutura

```text
paw-techstore/
├── api/          # API REST (Node, Express, Mongoose), em MVC
│   └── src/      # config, models, controllers, routes, middleware, services, seed
├── client/       # aplicação Angular (SPA)
├── devsecops/    # SonarQube, DefectDojo e relatórios
├── .github/      # workflows de CI e de segurança
└── docs/         # relatório e diagramas
```

## Notas de entrega

A pasta `node_modules` está no `.gitignore` e não vai no zip. Para pôr a correr
basta `npm install` em `api/` e em `client/`, definir a `MONGODB_URI` e correr o
seed.
