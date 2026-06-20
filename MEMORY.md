# CVM Monitor — System Memory
> Última atualização: 2026-06-20 17:43 UTC
> Este ficheiro é a fonte de verdade do sistema. Todos os agentes lêem daqui.

## URLs de Produção

| Recurso | URL |
|---|---|
| Site principal | https://cvm-monitor.vercel.app |
| Empresa | https://cvm-monitor.vercel.app/empresa?ticker=PETR4 |
| AQ/AL | https://cvm-monitor.vercel.app/aqal |
| Health | https://cvm-monitor.vercel.app/health |
| Memory API | https://cvm-monitor.vercel.app/memory |

## Stack Completo

| Componente | Identificador | Função |
|---|---|---|
| Vercel | prj_vduu1SG6DMk8lmi7rYDCH6YV0Ivd | Site + API serverless |
| Supabase | emumlldqewikrvbdfesd | Base de dados (307k+ filings) |
| GitHub cvm-site | glevy23-wq/cvm-site | Código do site (CI/CD auto) |
| GitHub cvm-sync | glevy23-wq/cvm-sync | Scripts Python + GitHub Actions |
| n8n | glevy23.app.n8n.cloud | Orquestrador 24/7 |

## n8n Workflows Activos (7 workflows)

| ID | Nome | Freq |
|---|---|---|
| J4h2UaMHkmNHchZW | CVM SCRAPER ENET 24/7 | 15min |
| ayaqcwhRA3N87U0l | CVM AQ/AL Upsert Supabase | webhook |
| 46ILQsb7uKn8kvTj | CVM CLASSIFICADOR OpenRouter | 30min |
| h9F3knivOuVZ2gNj | CVM ALERTAS WhatsApp ≥8 | 30min |
| Y2LCebZM19seOK0j | CTO AGENT Monitor Erros | 30min |
| BqX9gm8XqPxA9kZI | TASK DISPATCHER 3 modelos | webhook |
| EnBNOEPcF52TTUFw | VERCEL HEARTBEAT + Memória | 15min |

## Supabase — Tabelas Principais

| Tabela | Registros | Uso |
|---|---|---|
| filings | 307,873 | Todos os docs CVM 2015-2026 |
| aq_al_processed | 12+ | AQ/AL parseados (fonte única) |
| empresas_b3 | 645 | Índice de empresas B3 |
| agent_memory | viva | Memória partilhada entre agentes |
| companies_landing_precomputed | 645 | Cache metadados por empresa |

## Memory API — Como Usar

```
# Ler memória do sistema
GET https://cvm-monitor.vercel.app/memory?scope=system

# Ler chave específica
GET https://cvm-monitor.vercel.app/memory?key=vercel_heartbeat_last

# Gravar memória
POST https://cvm-monitor.vercel.app/memory
Body: {"key": "minha_chave", "value": "valor", "scope": "system", "importance": 8}
```

## Regras do Sistema

1. NUNCA baixar ZIPs CVM — usar endpoints ENET
2. aq_al_processed = única fonte para WhatsApp e site
3. agent_memory = memória partilhada entre TODOS os agentes
4. Supabase service_key para escrita; anon para leitura pública
5. n8n orquestra; GitHub Actions processa; Base44 decide
6. GitHub push → Vercel re-deploy automático
7. n8n healthcheck a cada 15min → alerta WhatsApp se Vercel cair

## Env Vars (Vercel)

```
SUPABASE_URL = https://emumlldqewikrvbdfesd.supabase.co
SUPABASE_SERVICE_KEY = [encrypted]
```

## GitHub Secrets (ambos repos)

```
VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID
SUPABASE_URL, SUPABASE_SERVICE_KEY
BASE44_WEBHOOK_URL (cvm-sync)
N8N_API_KEY_2 (cvm-sync)
OPENROUTER_API_KEY (cvm-sync)
```
