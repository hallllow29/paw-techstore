# DevSecOps — paw-techstore

Postura de segurança do projeto. Hosting **híbrido leve**: os _scans_ correm no
CI (GitHub Actions) e geram relatórios; os servidores de agregação (SonarQube e
DefectDojo) sobem **localmente** quando se quer consolidar/visualizar.

## Ferramentas e categorias cobertas

| Categoria          | Ferramenta(s)                 | Onde corre        |
| ------------------ | ----------------------------- | ----------------- |
| Secrets scanning   | Gitleaks, TruffleHog          | pre-commit + CI   |
| SAST               | Semgrep, SonarQube            | CI + local        |
| SCA (dependências) | Trivy, OWASP Dependency-Check | CI                |
| DAST               | OWASP ZAP (baseline)          | CI (app a correr) |
| SBOM               | Syft (CycloneDX)              | CI                |
| Agregação          | DefectDojo                    | local (demo)      |

## 1. SonarQube (local)

```bash
docker compose -f devsecops/docker-compose.yml up -d
# http://localhost:9000  (1º login: admin/admin → muda a password)
```

Gera um token em _My Account → Security_ e corre o scanner a partir da raiz:

```bash
# precisa de Java + sonar-scanner OU usa a imagem oficial:
docker run --rm --network host \
  -e SONAR_HOST_URL=http://localhost:9000 \
  -e SONAR_TOKEN=<o-teu-token> \
  -v "$(pwd):/usr/src" sonarsource/sonar-scanner-cli
```

## 2. DefectDojo (local, agregador central)

DefectDojo tem o seu próprio compose oficial:

```bash
git clone https://github.com/DefectDojo/django-DefectDojo
cd django-DefectDojo
docker compose up -d
# http://localhost:8080  (a password de admin é mostrada nos logs do initializer)
```

## 3. Importar relatórios para o DefectDojo

Os relatórios produzidos pelo CI (artifacts) são importados via API. O DefectDojo
tem _parsers_ nativos para todos os nossos formatos:

| Relatório                      | Parser DefectDojo     |
| ------------------------------ | --------------------- |
| `gitleaks.json`                | Gitleaks Scan         |
| `trufflehog.json`              | Trufflehog Scan       |
| `semgrep.sarif`                | Semgrep JSON Report   |
| `trivy.json`                   | Trivy Scan            |
| `dependency-check-report.json` | Dependency Check Scan |
| `zap.json`                     | ZAP Scan              |

Exemplo de import (endpoint `import-scan`):

```bash
curl -X POST "http://localhost:8080/api/v2/import-scan/" \
  -H "Authorization: Token <API_TOKEN>" \
  -F "scan_type=Trivy Scan" \
  -F "file=@devsecops/reports/trivy.json" \
  -F "engagement=<ID>"
```

> Para a defesa: subir SonarQube + DefectDojo, importar os relatórios do último
> CI e mostrar o dashboard consolidado de vulnerabilidades.
