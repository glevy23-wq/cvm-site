// sync-status.js — Actualiza system_status no Edge Config
// Cron: 1x por hora

const SUPA = process.env.SUPABASE_URL;
const KEY  = process.env.SUPABASE_SERVICE_KEY;
const EC_ID = 'ecfg_kxfajvv2fvcam49ajeviklqy7pce';
const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN;
const TEAM_ID = 'team_dQalzZQjOlCxp7dvSCclnxo4';

module.exports = async function handler(req, res) {
  try {
    // Contar filings recentes (últimas 24h)
    const since = new Date(Date.now() - 24*60*60*1000).toISOString().slice(0,10);
    const r = await fetch(
      `${SUPA}/rest/v1/filings?dtreceb=gte.${since}&select=id`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: 'count=exact', Range: '0-0' } }
    );
    const range = r.headers.get('content-range') || '0/0';
    const new_today = parseInt(range.split('/')[1]) || 0;
    
    // Actualizar Edge Config
    const status = {
      scraping_ok: new_today > 0,
      last_check: new Date().toISOString(),
      new_today,
      site_version: '1.2',
      total_empresas: 645
    };
    
    if (VERCEL_TOKEN) {
      await fetch(
        `https://api.vercel.com/v1/edge-config/${EC_ID}/items?teamId=${TEAM_ID}`,
        {
          method: 'PATCH',
          headers: { 
            Authorization: `Bearer ${VERCEL_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ items: [{ operation: 'upsert', key: 'system_status', value: status }] })
        }
      );
    }
    
    res.status(200).json({ ok: true, ...status });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
