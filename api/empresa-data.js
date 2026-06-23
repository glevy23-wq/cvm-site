// empresa-data.js v2 — campos completos + horareceb + tipodoc
// Cache 5min, compactação máxima

const SUPA = process.env.SUPABASE_URL || 'https://emumlldqewikrvbdfesd.supabase.co';
const KEY  = () => process.env.SUPABASE_SERVICE_KEY;

const FIELDS = 'dtreceb,horareceb,dtrefer,categdoc,tipodoc,assunto,linkdoc,dias_atraso,importancia,status_doc';

async function sfetch(path) {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: { apikey: KEY(), Authorization: `Bearer ${KEY()}` }
  });
  if (!r.ok) return [];
  return r.json();
}

export default async function handler(req, res) {
  if (!KEY()) { res.status(500).json({error:'Config error'}); return; }

  const rawCdcvm = req.query.cdcvm || req.query.ticker || '';
  if (!rawCdcvm) { res.status(400).json({error:'cdcvm required'}); return; }

  const cdcvm = rawCdcvm.replace(/-/g,'').replace(/^0+/,'').padStart(6,'0');

  // Contar total primeiro
  const countR = await fetch(
    `${SUPA}/rest/v1/filings?cdcvm=eq.${cdcvm}&select=id`,
    { headers: { apikey: KEY(), Authorization: `Bearer ${KEY()}`, Prefer:'count=exact', Range:'0-0' }}
  );
  const total = parseInt(countR.headers.get('content-range')?.split('/')[1] || '0');

  // Buscar em paralelo — batches de 1000
  const batches = Math.min(Math.ceil(total/1000), 8);
  const promises = Array.from({length: batches}, (_, i) =>
    sfetch(`filings?cdcvm=eq.${cdcvm}&select=${FIELDS}&order=dtreceb.desc,horareceb.desc&limit=1000&offset=${i*1000}`)
  );
  const results = await Promise.all(promises);

  // Deduplicar e compactar
  const seen = new Set();
  const filings = [];
  for (const batch of results) {
    for (const f of (batch||[])) {
      const key = f.linkdoc || `${f.dtreceb}|${f.categdoc}|${(f.assunto||'').slice(0,30)}`;
      if (!seen.has(key)) {
        seen.add(key);
        filings.push({
          d: f.dtreceb,
          h: f.horareceb || '',
          r: f.dtrefer || '',
          c: f.categdoc || '',
          t: f.tipodoc || '',
          a: f.assunto || '',
          l: f.linkdoc || '',
          ad: f.dias_atraso || 0,
          i: f.importancia || '',
          s: f.status_doc || 'Ativo'
        });
      }
    }
  }

  // Stats
  const anos = [...new Set(filings.map(f=>(f.d||'').slice(0,4)).filter(Boolean))].sort();
  let fr=0, fre=0, assembleia=0, dfp=0, aqal=0;
  for (const f of filings) {
    const c = (f.c||'').toLowerCase();
    if (c.includes('fato relevante')) fr++;
    if (c.includes('formulário de referência')) fre++;
    if (c.includes('assembleia')) assembleia++;
    if (c.includes('dados econôm') || c === 'dfp' || c === 'itr') dfp++;
    if (c.includes('aquisição') || c.includes('alienação')) aqal++;
  }

  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','s-maxage=300,stale-while-revalidate=120');
  res.setHeader('Access-Control-Allow-Origin','*');
  res.status(200).json({
    filings,
    stats: { total: filings.length, anos: anos.length, desde: anos[0]||'?', fr, fre, assembleia, dfp, aqal }
  });
}
