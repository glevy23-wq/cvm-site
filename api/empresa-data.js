// empresa-data.js v3 — versao, especiedoc, status_doc, motivo reapresentacao
const SUPA = process.env.SUPABASE_URL || 'https://emumlldqewikrvbdfesd.supabase.co';
const KEY  = () => process.env.SUPABASE_SERVICE_KEY;

const FIELDS = 'dtreceb,horareceb,dtrefer,categdoc,tipodoc,especiedoc,assunto,linkdoc,dias_atraso,importancia,status_doc,versao,motivo,iddoc';

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

  const countR = await fetch(
    `${SUPA}/rest/v1/filings?cdcvm=eq.${cdcvm}&select=id`,
    { headers: { apikey: KEY(), Authorization: `Bearer ${KEY()}`, Prefer:'count=exact', Range:'0-0' }}
  );
  const total = parseInt(countR.headers.get('content-range')?.split('/')[1] || '0');

  const batches = Math.min(Math.ceil(total/1000), 10);
  const promises = Array.from({length: batches}, (_, i) =>
    sfetch(`filings?cdcvm=eq.${cdcvm}&select=${FIELDS}&order=dtreceb.desc,horareceb.desc&limit=1000&offset=${i*1000}`)
  );
  const results = await Promise.all(promises);

  // Agrupar por iddoc_base para detectar reapresentacoes
  // iddoc pode ser "1234567" ou "1234567_v2" — pegar base
  const byBase = {};
  const all = [];
  for (const batch of results) {
    for (const f of (batch||[])) all.push(f);
  }

  // Encontrar grupos de reapresentacao: mesmo conteúdo (assunto+dtrefer+categdoc), versão diferente
  // Usar iddoc sem sufixo _vN como chave
  const getBase = (iddoc) => {
    if (!iddoc) return null;
    return String(iddoc).replace(/_v\d+$/, '').replace(/(IPE|FRE|DFP|ITR)\d+/, m => m);
  };

  // Agrupar por dtrefer+categdoc+assunto para detectar reapresentacoes
  const grupoKey = (f) => `${(f.dtrefer||'').slice(0,7)}|${f.categdoc||''}|${(f.assunto||'').slice(0,40)}`;
  const grupos = {};
  for (const f of all) {
    const k = grupoKey(f);
    if (!grupos[k]) grupos[k] = [];
    grupos[k].push(f);
  }

  // Marcar grupos com reapresentacao
  const reapSet = new Set();
  for (const [k, list] of Object.entries(grupos)) {
    if (list.length > 1) {
      for (const f of list) reapSet.add(f.iddoc);
    }
  }

  const seen = new Set();
  const filings = [];
  for (const f of all) {
    const key = f.iddoc || `${f.dtreceb}|${f.categdoc}|${(f.assunto||'').slice(0,30)}`;
    if (!seen.has(key)) {
      seen.add(key);
      // Separar HTML e PDF do linkdoc
      const links = (f.linkdoc || '').split('|||');
      const linkHtml = links[0] || '';
      const linkPdf  = links[1] || links[0] || '';
      filings.push({
        d:  f.dtreceb || '',
        h:  f.horareceb || '',
        r:  f.dtrefer || '',
        c:  f.categdoc || '',
        t:  f.tipodoc || '',
        e:  f.especiedoc || '',
        a:  f.assunto || '',
        lh: linkHtml,
        lp: linkPdf,
        ad: f.dias_atraso || 0,
        i:  f.importancia || '',
        s:  f.status_doc || 'Ativo',
        v:  f.versao || 1,
        m:  f.motivo || '',
        ri: reapSet.has(f.iddoc) ? 1 : 0,
      });
    }
  }

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
