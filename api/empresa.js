// empresa.js — Land page por empresa
// Routes: /empresa/PETR4, /empresa/VALE3, /empresa?ticker=PETR4

const SUPA = process.env.SUPABASE_URL || 'https://emumlldqewikrvbdfesd.supabase.co';
const KEY  = () => process.env.SUPABASE_SERVICE_KEY;
const sf   = (path) => fetch(`${SUPA}/rest/v1/${path}`, {
  headers: { apikey: KEY(), Authorization: `Bearer ${KEY()}` }
}).then(r => r.json());

export default async function handler(req, res) {
  if (!KEY()) { res.status(500).send('SUPABASE_SERVICE_KEY não configurado'); return; }

  // Extrair ticker do path (/empresa/PETR4) ou query (?ticker=PETR4 ou ?cdcvm=009512)
  const urlPath = req.url || '';
  const pathParts = urlPath.split('/').filter(Boolean);
  const pathParam = pathParts.find(p => p !== 'empresa');

  const rawTicker = (req.query.ticker || req.query.t || pathParam || 'PETR4').toUpperCase().trim();
  const rawCdcvm  = (req.query.cdcvm || req.query.cd || '').replace(/-/g,'');

  let cdcvm, ticker, nome;

  // Resolver para cdcvm
  if (rawCdcvm) {
    cdcvm = rawCdcvm.padStart(6,'0');
  } else {
    const emp = await sf(`empresas_b3?ticker=eq.${rawTicker}&select=cdcvm,ticker,denom_social&limit=1`);
    if (!emp || !emp[0]) {
      res.status(404).send(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px"><h2>❌ Empresa não encontrada: ${rawTicker}</h2><p>Verifique o ticker. Ex: PETR4, VALE3, ITUB4</p></body></html>`);
      return;
    }
    cdcvm  = emp[0].cdcvm;
    ticker = emp[0].ticker;
    nome   = emp[0].denom_social;
  }

  // Buscar pré-computado
  const precomp = await sf(`companies_landing_precomputed?cd_cvm=eq.${cdcvm}&limit=1`);
  if (!precomp || !precomp[0]) {
    res.status(404).send(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px"><h2>❌ Dados não encontrados: ${cdcvm}</h2></body></html>`);
    return;
  }

  const p       = precomp[0];
  const payload = typeof p.payload_json === 'string' ? JSON.parse(p.payload_json) : (p.payload_json || {});
  ticker = ticker || p.ticker  || rawTicker;
  nome   = nome   || p.denom_social || payload.denom_social || '';

  const filings   = payload.filings || [];
  const totalDocs = payload.total_filings || filings.length;
  const anos      = [...new Set(filings.map(f => (f.dtreceb||'').slice(0,4)).filter(Boolean))].sort((a,b) => b-a);

  const cats = {};
  for (const f of filings) { const c = f.categdoc||'Outros'; cats[c]=(cats[c]||0)+1; }
  const topCats = Object.entries(cats).sort((a,b) => b[1]-a[1]).slice(0,8);

  const rows = filings.slice(0,1000).map(f => {
    const dt  = (f.dtreceb||'').slice(0,10);
    const dtr = (f.dtrefer||'').slice(0,10);
    const cat = (f.categdoc||'-');
    const ass = (f.assunto||f.tipodoc||'').slice(0,80);
    const lnk = f.linkdoc||'';
    const s   = (cat+' '+ass).toLowerCase().replace(/"/g,'');
    return `<tr data-s="${s}"><td>${dt}</td><td>${dtr}</td><td class="tc">${cat}</td><td class="ta">${ass}</td><td>${lnk?`<a class="lnk" href="${lnk}" target="_blank">📄</a>`:''}</td></tr>`;
  }).join('');

  const chips = topCats.map(([c,n]) =>
    `<span class="chip" onclick="filt('${c.toLowerCase().replace(/'/g,'').slice(0,50)}')">${c.slice(0,42)} (${n})</span>`
  ).join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${ticker} — CVM Monitor</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f6fa;color:#1a1a2e}
.hdr{background:#1a1a2e;color:#fff;padding:16px 24px;display:flex;align-items:center;gap:14px}
.tk{background:#e74c3c;padding:6px 16px;border-radius:6px;font-size:22px;font-weight:800}
.hi h1{font-size:17px;font-weight:600}.hi small{color:#aaa;font-size:11px}
.nav{background:#fff;border-bottom:2px solid #eee;padding:0 20px;display:flex;gap:0;overflow-x:auto}
.nav span{display:block;padding:11px 16px;color:#666;font-size:12px;font-weight:500;white-space:nowrap;border-bottom:3px solid transparent;cursor:pointer}
.nav span.on{color:#e74c3c;border-bottom-color:#e74c3c}
.wrap{max-width:1200px;margin:0 auto;padding:18px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:18px}
.stat{background:#fff;border-radius:8px;padding:14px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.08)}
.stat .n{font-size:24px;font-weight:700}.stat .l{font-size:10px;color:#888;margin-top:3px}
.card{background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.08);margin-bottom:18px;overflow:hidden}
.ch{padding:13px 18px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between}
.ch h2{font-size:13px;font-weight:600}
.sw{padding:10px 18px;border-bottom:1px solid #f0f0f0}
.sw input{width:100%;padding:9px 14px;border:1px solid #ddd;border-radius:6px;font-size:13px;outline:none}
.sw input:focus{border-color:#e74c3c}
.chips{padding:10px 18px;border-bottom:1px solid #f0f0f0;display:flex;flex-wrap:wrap;gap:5px}
.chip{padding:4px 10px;background:#f0f4ff;border-radius:16px;font-size:10px;cursor:pointer;border:1px solid #dde}
.chip:hover,.chip.on{background:#1a1a2e;color:#fff;border-color:#1a1a2e}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:9px 14px;font-size:10px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:.4px;background:#fafafa;border-bottom:1px solid #eee}
td{padding:8px 14px;font-size:12px;border-bottom:1px solid #f8f8f8;vertical-align:middle}
.tc{max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ta{max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#555}
tr:hover td{background:#fafafa}
.lnk{color:#1a73e8;text-decoration:none;font-size:14px}
.more{text-align:center;padding:12px;color:#888;font-size:11px;background:#fafafa}
footer{text-align:center;padding:24px;color:#aaa;font-size:10px}
</style>
</head>
<body>
<div class="hdr">
  <div class="tk">${ticker}</div>
  <div class="hi"><h1>${nome}</h1><small>CDCVM: ${parseInt(cdcvm)} · ${totalDocs.toLocaleString('pt-BR')} docs · Actualizado 15min</small></div>
</div>
<nav class="nav">
  <span class="on" onclick="filt('')">📋 Todos (${totalDocs.toLocaleString('pt-BR')})</span>
  <span onclick="filt('fato relevante')">🔴 Fatos Relevantes</span>
  <span onclick="filt('aquisição')">📊 AQ/AL</span>
  <span onclick="filt('assembleia')">🏛️ Assembleias</span>
  <span onclick="filt('comunicado')">📢 Comunicados</span>
  <span onclick="filt('formulário')">📄 FRE/FCA</span>
</nav>
<div class="wrap">
  <div class="stats">
    <div class="stat"><div class="n">${totalDocs.toLocaleString('pt-BR')}</div><div class="l">Documentos CVM</div></div>
    <div class="stat"><div class="n">${anos.length}</div><div class="l">Anos histórico</div></div>
    <div class="stat"><div class="n">${anos[0]||'-'}</div><div class="l">Mais recente</div></div>
    <div class="stat"><div class="n">${anos[anos.length-1]||'-'}</div><div class="l">Mais antigo</div></div>
  </div>
  <div class="card">
    <div class="ch"><h2>📋 Documentos — ${ticker}</h2><span style="font-size:10px;color:#aaa">CVM ENET · 15min</span></div>
    <div class="sw"><input type="text" id="srch" placeholder="🔍 Buscar ${totalDocs.toLocaleString('pt-BR')} documentos..." oninput="buscar(this.value)"></div>
    <div class="chips"><span class="chip on" onclick="filt('')">Todos</span>${chips}</div>
    <table><thead><tr><th>Entrega</th><th>Referência</th><th>Categoria</th><th>Assunto</th><th>Doc</th></tr></thead>
    <tbody id="tb">${rows}</tbody></table>
    ${totalDocs > 1000 ? `<div class="more">Mostrando 1.000 de ${totalDocs.toLocaleString('pt-BR')} docs. Use a busca para filtrar.</div>` : ''}
  </div>
</div>
<footer>cvm-monitor.vercel.app · Dados CVM ENET · Zero IA · Open data</footer>
<script>
const rs=[...document.querySelectorAll('#tb tr')];
let ac='';
function buscar(q){const t=q.toLowerCase();rs.forEach(r=>{r.style.display=(r.dataset.s.includes(t)&&(!ac||r.dataset.s.includes(ac)))?'':'none'})}
function filt(cat){ac=cat.toLowerCase();document.getElementById('srch').value='';rs.forEach(r=>{r.style.display=(!ac||r.dataset.s.includes(ac))?'':'none'});document.querySelectorAll('.chip,.nav span').forEach(c=>c.classList.remove('on'));if(event&&event.target)event.target.classList.add('on')}
</script>
</body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
  res.status(200).send(html);
}
