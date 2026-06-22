// empresa-data.js — JSON com todos os docs, campos mínimos
// Chamado via fetch() depois do DOM estar pronto

const SUPA = process.env.SUPABASE_URL || 'https://emumlldqewikrvbdfesd.supabase.co';
const KEY  = () => process.env.SUPABASE_SERVICE_KEY;

async function sfetch(path) {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: { apikey: KEY(), Authorization: `Bearer ${KEY()}` }
  });
  return r.json();
}

export default async function handler(req, res) {
  if (!KEY()) { res.status(500).json({error:'Config error'}); return; }

  const rawCdcvm = req.query.cdcvm || req.query.ticker || '';
  if (!rawCdcvm) { res.status(400).json({error:'cdcvm required'}); return; }

  const cdcvm = rawCdcvm.replace(/-/g,'').replace(/^0+/,'').padStart(6,'0');

  // Buscar todos os filings — campos mínimos para reduzir payload
  // d=dtreceb, r=dtrefer, c=categdoc, a=assunto, l=linkdoc, ad=dias_atraso, i=importancia
  const [f1,f2,f3,f4,f5,f6,f7] = await Promise.all([
    sfetch(`filings?cdcvm=eq.${cdcvm}&select=dtreceb,dtrefer,categdoc,assunto,linkdoc,dias_atraso,importancia&order=dtreceb.desc&limit=1000&offset=0`),
    sfetch(`filings?cdcvm=eq.${cdcvm}&select=dtreceb,dtrefer,categdoc,assunto,linkdoc,dias_atraso,importancia&order=dtreceb.desc&limit=1000&offset=1000`),
    sfetch(`filings?cdcvm=eq.${cdcvm}&select=dtreceb,dtrefer,categdoc,assunto,linkdoc,dias_atraso,importancia&order=dtreceb.desc&limit=1000&offset=2000`),
    sfetch(`filings?cdcvm=eq.${cdcvm}&select=dtreceb,dtrefer,categdoc,assunto,linkdoc,dias_atraso,importancia&order=dtreceb.desc&limit=1000&offset=3000`),
    sfetch(`filings?cdcvm=eq.${cdcvm}&select=dtreceb,dtrefer,categdoc,assunto,linkdoc,dias_atraso,importancia&order=dtreceb.desc&limit=1000&offset=4000`),
    sfetch(`filings?cdcvm=eq.${cdcvm}&select=dtreceb,dtrefer,categdoc,assunto,linkdoc,dias_atraso,importancia&order=dtreceb.desc&limit=1000&offset=5000`),
    sfetch(`filings?cdcvm=eq.${cdcvm}&select=dtreceb,dtrefer,categdoc,assunto,linkdoc,dias_atraso,importancia&order=dtreceb.desc&limit=1000&offset=6000`),
  ]);

  // Deduplicar por linkdoc e compactar campos
  const seen = new Set();
  const filings = [];
  for (const f of [...(f1||[]),...(f2||[]),...(f3||[]),...(f4||[]),...(f5||[]),...(f6||[]),...(f7||[])]) {
    const key = f.linkdoc || (f.dtreceb + '|' + f.categdoc + '|' + (f.assunto||'').slice(0,30));
    if (!seen.has(key)) {
      seen.add(key);
      // Compactar: trocar nomes de campos por 1 letra = reduz payload ~40%
      filings.push({
        d: f.dtreceb,
        r: f.dtrefer,
        c: f.categdoc || '',
        a: f.assunto || '',
        l: f.linkdoc || '',
        ad: f.dias_atraso,
        i: f.importancia || ''
      });
    }
  }

  // Stats
  const anos = [...new Set(filings.map(f=>(f.d||'').slice(0,4)).filter(Boolean))].sort();
  const cats = {};
  for (const f of filings) {
    const c = (f.c||'').toLowerCase();
    if (c.includes('fato relevante')) cats.fr = (cats.fr||0)+1;
    if (c === 'fre' || c.includes('formulário de referência')) cats.fre = (cats.fre||0)+1;
    if (c.includes('assembleia')) cats.assembleia = (cats.assembleia||0)+1;
    if (c.includes('dados econôm') || c.includes('dfp') || c.includes('itr')) cats.dfp = (cats.dfp||0)+1;
  }

  const payload = {
    filings,
    stats: {
      total: filings.length,
      anos: anos.length,
      desde: anos[0] || '?',
      fr: cats.fr || 0,
      fre: cats.fre || 0,
      assembleia: cats.assembleia || 0,
      dfp: cats.dfp || 0
    }
  };

  // Compressão máxima via gzip (Vercel suporta)
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','s-maxage=300,stale-while-revalidate=60');
  res.setHeader('Access-Control-Allow-Origin','*');
  res.status(200).json(payload);
}
