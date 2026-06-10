# ADR 0001 — Arquitetura DevSecOps (gate na cloud + cockpit local automático)

- **Estado:** Aceite
- **Data:** 2026-06-10
- **Contexto:** PAW — Avaliação de Recurso (paw-techstore)

## Contexto

O projeto deve demonstrar um ciclo de desenvolvimento profissional (SDLC) com
verificação de qualidade e segurança automatizada. Objetivos:

1. Validação automática a cada alteração (build, testes, lint) — reproduzível,
   que prove que o trabalho "funciona em qualquer máquina".
2. Análise de segurança contínua com dashboards (SonarQube para qualidade,
   DefectDojo para gestão consolidada de vulnerabilidades), **alimentados
   automaticamente** — não manualmente.

Os runners da cloud (GitHub-hosted) não conseguem alcançar `localhost` da máquina
do programador (rede privada/NAT). Expor o SonarQube/DefectDojo à internet por
**túnel** (cloudflared/ngrok) foi considerado e **rejeitado** por acrescentar
superfície de ataque e gestão de segredos desnecessárias.

## Decisão

Três workflows com responsabilidades distintas, em dois tipos de runner:

| Workflow             | Runner                             | Responsabilidade                                              |
| -------------------- | ---------------------------------- | ------------------------------------------------------------- |
| `ci.yml`             | ☁️ GitHub-hosted                   | build, testes, lint — gate + **prova de portabilidade**       |
| `security.yml`       | ☁️ GitHub-hosted                   | scanners → SARIF/artifacts (evidência na cloud)               |
| `security-local.yml` | 🖥️ **self-hosted (máquina local)** | scanners → **alimenta SonarQube + DefectDojo em `localhost`** |

A chave: o `security-local.yml` corre num **self-hosted runner** na própria
máquina. Como o job executa localmente, `localhost` é a máquina do programador —
alcança o SonarQube e o DefectDojo **diretamente, sem túnel**. Dispara a cada
push e por agendamento (6/6h), pelo que os dashboards são alimentados de forma
**automática e contínua**.

O CI de qualidade (`ci.yml`) **permanece na cloud** para não perder a prova de
portabilidade. Os scanners correm em contentores Docker (versões fixas, sem
instalar ferramentas no sistema). Os tokens (Sonar/DefectDojo) vivem em **GitHub
Secrets** e são injetados como variáveis de ambiente no runner local.

## Consequências

**Positivas**

- Dashboards (SonarQube/DefectDojo) alimentados automaticamente a cada push.
- Sem túnel nem exposição à internet; nada do localhost fica público.
- CI de qualidade reproduzível na cloud → prova "funciona em qualquer máquina".
- Scanners dockerizados → setup mínimo (só Docker).

**Negativas / trade-offs**

- O `security-local.yml` só corre quando o self-hosted runner está ativo (a
  máquina ligada). Aceitável: o cockpit é para análise/demonstração contínua.
- Sobreposição parcial de scanners entre cloud e local (defense in depth) —
  intencional.

## Alternativas consideradas

- **Túnel (cloudflared/ngrok):** expor as tools locais por URL público para o
  runner da cloud lhes chegar. **Rejeitado** — superfície de ataque e segredos.
- **Só local manual (`npm run security:local`):** continua disponível para
  execução ad-hoc, mas não cumpre o requisito de alimentação automática.
