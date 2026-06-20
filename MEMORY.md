# CVM Monitor — System Memory
> Atualizado automaticamente. Fonte de verdade para todos os agentes.

## Stack

| Componente | URL / ID | Função |
|---|---|---|
| Vercel | cvm-monitor.vercel.app | Frontend + API serverless |
| Supabase | emumlldqewikrvbdfesd | Base de dados principal |
| GitHub | glevy23-wq/cvm-site | Código do site |
| GitHub | glevy23-wq/cvm-sync | Scripts Python + GitHub Actions |
| n8n | glevy23.app.n8n.cloud | Orquestrador 24/7 |

## APIs (Vercel)

| Endpoint | Descrição |
|---|---|
| GET /empresa?ticker=PETR4 | Página de empresa com filings + AQ/AL |
| GET /aqal?dias=30 | Tabela de participações |
| GET /api/health | Status do sistema |
| GET /api/memory?scope=system | Ler memória partilhada |
| POST /api/memory | Gravar memória |

## Supabase Tables

| Tabela | Registros | Função |
|---|---|---|
| filings | 307k+ | Todos os docs CVM (2015-2026) |
| aq_al_processed | crescente | AQ/AL parseados (fonte única) |
| empresas_b3 | 645 | Índice de empresas |
| agent_memory | viva | Memória partilhada entre agentes |
| companies_landing_precomputed | 645 | Cache de metadados por empresa |

## n8n Workflows Activos

| ID | Nome | Frequência |
|---|---|---|
| J4h2UaMHkmNHchZW | CVM SCRAPER ENET 24/7 | a cada 15min |
| ayaqcwhRA3N87U0l | CVM AQ/AL Upsert Supabase | webhook |
| 46ILQsb7uKn8kvTj | CVM CLASSIFICADOR OpenRouter | a cada 30min |
| h9F3knivOuVZ2gNj | CVM ALERTAS WhatsApp | a cada 30min |
| Y2LCebZM19seOK0j | CTO AGENT Monitor de Erros | a cada 30min |
| BqX9gm8XqPxA9kZI | TASK DISPATCHER 3 modelos | webhook |

## GitHub Actions (cvm-sync)

| Workflow | Schedule |
|---|---|
| cvm_aq_daily.yml | 10h BRT dias úteis |

## Env Vars (Vercel)

```
SUPABASE_URL=https://emumlldqewikrvbdfesd.supabase.co
SUPABASE_SERVICE_KEY=configurado
```

## Regras Críticas

1. NUNCA baixar ZIPs CVM completos
2. Tabela aq_al_processed é a única fonte para WhatsApp e site
3. agent_memory é a memória partilhada entre TODOS os agentes
4. Supabase service_key para escrita; anon key para leitura pública
5. n8n orquestra, GitHub Actions processa, Base44 decide
