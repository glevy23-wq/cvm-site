// health.js — Heartbeat + Status do sistema
// Roda a cada 15min via Vercel Cron
// Grava em agent_memory no Supabase — memória partilhada entre todos os agentes

const SUPA_URL = process.env.SUPABASE_URL || "https://emumlldqewikrvbdfesd.supabase.co";
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  const isAutoCron = req.headers['x-vercel-cron'] === '1';
  const now = new Date().toISOString();

  // Checar aq_al_processed
  const [rAqal, rFilings, rEmpresas] = await Promise.all([
    fetch(`${SUPA_URL}/rest/v1/aq_al_processed?select=count`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, Prefer: 'count=exact', Range: '0-0' }
    }),
    fetch(`${SUPA_URL}/rest/v1/filings?select=count`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, Prefer: 'count=exact', Range: '0-0' }
    }),
    fetch(`${SUPA_URL}/rest/v1/empresas_b3?select=count`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, Prefer: 'count=exact', Range: '0-0' }
    })
  ]);

  const aqalCount   = rAqal.headers.get('content-range')?.split('/')[1] ?? '?';
  const filingsCount = rFilings.headers.get('content-range')?.split('/')[1] ?? '?';
  const empresasCount = rEmpresas.headers.get('content-range')?.split('/')[1] ?? '?';

  const status = {
    timestamp: now,
    vercel: "ok",
    supabase: rFilings.ok ? "ok" : "error",
    aqal_count: parseInt(aqalCount),
    filings_count: parseInt(filingsCount),
    empresas_count: parseInt(empresasCount),
    env: {
      has_supabase_url: !!process.env.SUPABASE_URL,
      has_supabase_key: !!process.env.SUPABASE_SERVICE_KEY,
      node_version: process.version,
      vercel_region: process.env.VERCEL_REGION || 'unknown'
    }
  };

  // Se cron automático → gravar memória no Supabase
  if (isAutoCron && SUPA_KEY) {
    await fetch(`${SUPA_URL}/rest/v1/agent_memory`, {
      method: 'POST',
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        key: 'vercel_health_last',
        scope: 'system',
        value: JSON.stringify(status),
        author: 'vercel_cron',
        importance: 3,
        updated_at: now
      })
    });
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(status);
}
