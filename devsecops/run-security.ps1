<#
.SYNOPSIS
  Orquestração DevSecOps local — corre os scanners (via Docker), envia métricas
  para o SonarQube local e importa as vulnerabilidades no DefectDojo local.
  Tudo em localhost → localhost, sem túneis nem exposição à internet (ver ADR 0001).

.EXAMPLE
  ./devsecops/run-security.ps1
  ./devsecops/run-security.ps1 -SkipSonar
  ./devsecops/run-security.ps1 -IncludeDependencyCheck
#>
[CmdletBinding()]
param(
  [switch]$SkipScanners,
  [switch]$SkipSonar,
  [switch]$SkipDojo,
  [switch]$IncludeDependencyCheck  # lento (descarrega base NVD na 1ª vez)
)

# 'Continue' (nao 'Stop'): ferramentas em Docker escrevem no stderr e isso nao
# deve abortar o script — o sucesso/falha e avaliado por exit code / HTTP code.
$ErrorActionPreference = 'Continue'
$root = (Resolve-Path "$PSScriptRoot\..").Path
$reports = Join-Path $PSScriptRoot 'reports'
New-Item -ItemType Directory -Force -Path $reports | Out-Null

# ── Carregar devsecops/.env ──
$envFile = Join-Path $PSScriptRoot '.env'
$cfg = @{}
if (Test-Path $envFile) {
  Get-Content $envFile | Where-Object { $_ -match '^\s*[^#].*=' } | ForEach-Object {
    $k, $v = $_ -split '=', 2
    $cfg[$k.Trim()] = $v.Trim()
  }
} else {
  Write-Warning "Sem devsecops/.env — copia o .env.example. SonarQube/DefectDojo serão saltados."
}

# Variaveis de ambiente (ex: GitHub Secrets no self-hosted runner) tem prioridade sobre o .env
foreach ($k in 'SONAR_URL', 'SONAR_TOKEN', 'DEFECTDOJO_URL', 'DEFECTDOJO_TOKEN', 'DEFECTDOJO_ENGAGEMENT_ID') {
  $ev = [Environment]::GetEnvironmentVariable($k)
  if ($ev) { $cfg[$k] = $ev }
}

# Defaults dos URLs (localhost) — assim o .env so precisa dos tokens + engagement
if (-not $cfg.SONAR_URL) { $cfg.SONAR_URL = 'http://localhost:9000' }
if (-not $cfg.DEFECTDOJO_URL) { $cfg.DEFECTDOJO_URL = 'http://localhost:8080' }
if (-not $cfg.DEFECTDOJO_ENGAGEMENT_ID) { $cfg.DEFECTDOJO_ENGAGEMENT_ID = '1' }

function Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }

# Corre um scanner em Docker; falha de um scanner não aborta os restantes.
function Invoke-Scanner($name, [scriptblock]$cmd) {
  Step "Scanner: $name"
  try { & $cmd; Write-Host "[$name] OK" -ForegroundColor Green }
  catch { Write-Warning "[$name] falhou: $($_.Exception.Message)" }
}

# ─────────────────────────────────────────────────────────────
# 1. SCANNERS (via Docker → relatórios em devsecops/reports/)
# ─────────────────────────────────────────────────────────────
if (-not $SkipScanners) {
  $mount = "${root}:/src"

  Invoke-Scanner 'Semgrep (SAST)' {
    docker run --rm -v $mount -w /src semgrep/semgrep `
      semgrep scan --config auto --json -o devsecops/reports/semgrep.json
  }
  Invoke-Scanner 'Trivy (SCA)' {
    docker run --rm -v $mount -w /src aquasec/trivy fs `
      --scanners vuln,secret,misconfig --format json `
      -o devsecops/reports/trivy.json .
  }
  Invoke-Scanner 'Gitleaks (secrets)' {
    docker run --rm -v $mount -w /src zricethezav/gitleaks:latest detect `
      --source=. --report-format=json `
      --report-path=devsecops/reports/gitleaks.json --exit-code 0
  }
  Invoke-Scanner 'TruffleHog (secrets)' {
    $thOut = Join-Path $reports 'trufflehog.json'
    docker run --rm -v $mount trufflesecurity/trufflehog:latest `
      filesystem /src --json | Out-File -Encoding utf8 $thOut
  }
  Invoke-Scanner 'Syft (SBOM)' {
    docker run --rm -v $mount anchore/syft:latest dir:/src `
      -o "cyclonedx-json=/src/devsecops/reports/sbom.cyclonedx.json"
  }
  if ($IncludeDependencyCheck) {
    Invoke-Scanner 'OWASP Dependency-Check (SCA)' {
      docker run --rm -v $mount -v dependency-check-data:/usr/share/dependency-check/data `
        owasp/dependency-check --scan /src --format JSON `
        --out /src/devsecops/reports --project paw-techstore
    }
  }
}

# ─────────────────────────────────────────────────────────────
# 2. SONARQUBE (sonar-scanner → SonarQube local)
# ─────────────────────────────────────────────────────────────
if (-not $SkipSonar -and $cfg.SONAR_TOKEN) {
  Step 'SonarQube — análise'
  # host.docker.internal → o SonarQube a correr na máquina host
  $sonarHost = ($cfg.SONAR_URL -replace 'localhost', 'host.docker.internal')
  # Passar via env vars (a imagem suporta-as) evita problemas de parsing dos args -D no PowerShell
  docker run --rm `
    -e SONAR_HOST_URL=$sonarHost `
    -e SONAR_TOKEN=$($cfg.SONAR_TOKEN) `
    -v "${root}:/usr/src" sonarsource/sonar-scanner-cli
  if ($LASTEXITCODE -eq 0) {
    Write-Host "[SonarQube] análise enviada → $($cfg.SONAR_URL)" -ForegroundColor Green
  } else {
    Write-Warning "[SonarQube] falhou (exit $LASTEXITCODE)"
  }
} elseif (-not $SkipSonar) {
  Write-Warning 'SonarQube saltado (SONAR_TOKEN em falta no devsecops/.env).'
}

# ─────────────────────────────────────────────────────────────
# 3. DEFECTDOJO (importar relatórios via API)
# ─────────────────────────────────────────────────────────────
function Import-ToDojo($scanType, $file) {
  $path = Join-Path $reports $file
  if (-not (Test-Path $path)) { Write-Host "  (sem $file, salta)" -ForegroundColor DarkGray; return }
  # auto_create_context: o DefectDojo cria Product + Engagement se nao existirem
  $resp = curl.exe -s -o NUL -w "%{http_code}" -X POST "$($cfg.DEFECTDOJO_URL)/api/v2/import-scan/" `
    -H "Authorization: Token $($cfg.DEFECTDOJO_TOKEN)" `
    -F "scan_type=$scanType" -F "file=@$path" `
    -F "product_name=paw-techstore" -F "engagement_name=DevSecOps" `
    -F "product_type_name=Research and Development" -F "auto_create_context=true" `
    -F "active=true" -F "verified=false"
  if ($resp -eq '201') { Write-Host "  [$scanType] importado" -ForegroundColor Green }
  else { Write-Warning "  [$scanType] HTTP $resp" }
}

if (-not $SkipDojo -and $cfg.DEFECTDOJO_TOKEN) {
  Step 'DefectDojo — importar relatórios'
  Import-ToDojo 'Semgrep JSON Report'   'semgrep.json'
  Import-ToDojo 'Trivy Scan'            'trivy.json'
  Import-ToDojo 'Gitleaks Scan'         'gitleaks.json'
  Import-ToDojo 'Trufflehog Scan'       'trufflehog.json'
  Import-ToDojo 'Dependency Check Scan' 'dependency-check-report.json'
} elseif (-not $SkipDojo) {
  Write-Warning 'DefectDojo saltado (DEFECTDOJO_TOKEN em falta no devsecops/.env).'
}

Step 'Concluído'
Write-Host "Relatórios em: $reports" -ForegroundColor Cyan
Write-Host "SonarQube:  $($cfg.SONAR_URL)" -ForegroundColor Cyan
Write-Host "DefectDojo: $($cfg.DEFECTDOJO_URL)" -ForegroundColor Cyan
