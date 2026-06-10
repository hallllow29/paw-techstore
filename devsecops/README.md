# DevSecOps — paw-techstore

Arquitetura em duas camadas (ver [ADR 0001](../docs/adr/0001-devsecops-architecture.md)):

- ☁️ **Gate (GitHub Actions)** — build, testes, lint e scanners a cada push/PR.
  Bloqueia PRs maus e prova portabilidade. (`.github/workflows/`)
- 🖥️ **Cockpit (local)** — os scanners correm na tua máquina (via Docker) e
  alimentam **SonarQube + DefectDojo em `localhost`**. Sem túneis.

## Ferramentas e categorias

| Categoria        | Ferramenta(s)                 | Cloud (gate) | Local (cockpit) |
| ---------------- | ----------------------------- | :----------: | :-------------: |
| Secrets          | Gitleaks, TruffleHog          |      ✅      |       ✅        |
| SAST             | Semgrep                       |      ✅      |       ✅        |
| SAST + Qualidade | SonarQube                     |      —       |       ✅        |
| SCA              | Trivy, OWASP Dependency-Check |      ✅      |       ✅        |
| DAST             | OWASP ZAP                     |      ✅      |        —        |
| SBOM             | Syft (CycloneDX)              |      ✅      |       ✅        |
| Agregação        | DefectDojo                    |      —       |       ✅        |

---

## Cockpit local — setup (uma vez)

### 1. Subir o SonarQube

```bash
docker compose -f devsecops/docker-compose.yml up -d
# http://localhost:9000  (1º login: admin/admin → muda a password)
```

Gera um token em **My Account → Security**.

### 2. Subir o DefectDojo

DefectDojo tem o seu próprio compose oficial:

```bash
git clone https://github.com/DefectDojo/django-DefectDojo
cd django-DefectDojo && docker compose up -d
# password de admin:
docker compose logs initializer | Select-String "Admin password"
# http://localhost:8080
```

No DefectDojo: cria um **Product** + **Engagement** (anota o ID) e gera a tua
**API v2 Key** no perfil.

### 3. Configurar credenciais

```bash
cp devsecops/.env.example devsecops/.env
# preenche SONAR_TOKEN, DEFECTDOJO_TOKEN e DEFECTDOJO_ENGAGEMENT_ID
```

---

## Correr a análise (sempre que quiseres)

```powershell
# tudo: scanners → SonarQube → DefectDojo
npm run security:local

# variantes
./devsecops/run-security.ps1 -SkipSonar              # só scanners + DefectDojo
./devsecops/run-security.ps1 -IncludeDependencyCheck # inclui Dependency-Check (lento)
```

O script (`run-security.ps1`):

1. Corre Semgrep, Trivy, Gitleaks, TruffleHog, Syft em contentores Docker →
   relatórios em `devsecops/reports/`.
2. Corre o `sonar-scanner` → envia para o SonarQube local.
3. Importa cada relatório no DefectDojo via API (`import-scan`).

> **Pré-requisitos:** Docker (já tens). Não precisas de instalar os scanners nem
> o sonar-scanner — correm todos via Docker.

## Para a defesa

Sobe SonarQube + DefectDojo, corre `npm run security:local`, e mostra os dois
dashboards: **SonarQube** (qualidade + quality gate) e **DefectDojo** (todas as
vulnerabilidades consolidadas por severidade).
