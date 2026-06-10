# ADR 0001 — Arquitetura DevSecOps (gate na cloud + análise local)

- **Estado:** Aceite
- **Data:** 2026-06-10
- **Contexto:** PAW — Avaliação de Recurso (paw-techstore)

## Contexto

O projeto deve demonstrar um ciclo de desenvolvimento profissional (SDLC) com
verificação de qualidade e segurança automatizada. Queremos:

1. Validação automática a cada alteração (build, testes, lint) — visível e
   reproduzível, que prove que o trabalho "funciona em qualquer máquina".
2. Análise de segurança aprofundada com dashboards (SonarQube para qualidade,
   DefectDojo para gestão consolidada de vulnerabilidades).

Os runners da cloud (GitHub-hosted) **não conseguem alcançar `localhost`** da
máquina do programador (rede privada/NAT). Expor o SonarQube/DefectDojo à
internet (túnel ou self-hosted runner) foi considerado e **rejeitado** por
acrescentar infraestrutura e superfície de ataque desnecessárias a um trabalho
individual.

## Decisão

Separar responsabilidades em duas camadas independentes:

| Camada                | Onde corre             | Responsabilidade                                                                   |
| --------------------- | ---------------------- | ---------------------------------------------------------------------------------- |
| **Gate (CI/CD)**      | GitHub Actions (cloud) | build, testes, lint, scanners → SARIF/artifacts; bloqueia PRs; prova portabilidade |
| **Cockpit (análise)** | Máquina local          | scanners via Docker → SonarQube + DefectDojo em `localhost`                        |

O fluxo local é `localhost → localhost`, sem túneis nem exposição à internet. Os
scanners correm em contentores Docker (versões fixas, sem instalar ferramentas no
sistema). Um único comando (`devsecops/run-security.ps1`) orquestra tudo.

## Consequências

**Positivas**

- Sem superfície de ataque nova; nada exposto à internet.
- CI reproduzível prova o requisito "funciona em qualquer máquina".
- Dashboards ricos (SonarQube/DefectDojo) para a defesa, alimentados localmente.
- Scanners dockerizados → setup mínimo (só Docker + sonar-scanner).

**Negativas / trade-offs**

- A análise local é acionada manualmente (não a cada push). Aceitável: os
  dashboards são para inspeção/demonstração, não um gate bloqueante.
- Sobreposição parcial de scanners entre cloud e local (defense in depth) —
  intencional.

## Alternativas consideradas

- **Self-hosted runner:** o CI correria na máquina local e alcançaria `localhost`.
  Rejeitado: o CI deixaria de provar portabilidade (dependeria do PC ligado).
- **Túnel (cloudflared/ngrok):** expor as tools locais por URL público.
  Rejeitado: infraestrutura e gestão de segredos a mais para o ganho.
