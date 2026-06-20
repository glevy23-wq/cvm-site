// memory.js — API de memória partilhada entre todos os agentes
// GET  /api/memory?scope=system       → lista memória
// GET  /api/memory?key=vercel_health  → valor específico
// POST /api/memory  body: {key, value, scope, author, importance}

const SUPA_URL = process.env.SUPABASE_URL || "https://emumlldqewikrvbdfesd.supabase.co";
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
const H = () => ({ apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json' });

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (req.method === 'GET') {
    const { key, scope = 'system', limit = 50 } = req.query;
    let url = `${SUPA_URL}/rest/v1/agent_memory?order=importance.desc,updated_at.desc&limit=${limit}`;
    if (key)   url += `&key=eq.${encodeURIComponent(key)}`;
    if (scope && !key) url += `&scope=eq.${encodeURIComponent(scope)}`;

    const r = await fetch(url, { headers: H() });
    const data = await r.json();
    res.status(200).json({ count: Array.isArray(data) ? data.length : 0, data });
    return;
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    if (!body.key || !body.value) { res.status(400).json({ error: 'key e value obrigatórios' }); return; }

    const payload = {
      key: body.key,
      scope: body.scope || 'system',
      value: typeof body.value === 'string' ? body.value : JSON.stringify(body.value),
      author: body.author || 'api',
      importance: body.importance || 5,
      updated_at: new Date().toISOString()
    };

    const r = await fetch(`${SUPA_URL}/rest/v1/agent_memory`, {
      method: 'POST',
      headers: { ...H(), Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(payload)
    });

    const ok = r.ok || r.status === 201;
    res.status(ok ? 200 : 500).json({ ok, key: payload.key });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
