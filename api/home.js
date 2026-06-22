// home.js v4 — carrega lista de /companies_list.json (CDN, <200ms)
module.exports = async function handler(req, res) {
  const q = (req.query.q || '').toLowerCase().trim();

  // Buscar lista de empresas do CDN local (zero Supabase)
  let empresas = [];
  try {
    const r = await fetch('https://cvm-monitor.vercel.app/companies_list.json');
    empresas = await r.json(); // [[cdcvm, ticker, nome, setor, cat], ...]
  } catch(e) {
    // fallback: Supabase direto
    const SUPA = process.env.SUPABASE_URL;
    const KEY  = process.env.SUPABASE_SERVICE_KEY;
    const r2 = await fetch(`${SUPA}/rest/v1/empresas_b3?select=cdcvm,ticker,denom_social&order=denom_social.asc&limit=1000`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    const rows = await r2.json();
    empresas = rows.map(r => [r.cdcvm, r.ticker||'', r.denom_social,'','']);
  }

  const filtered = q
    ? empresas.filter(([cd, tk, nm]) =>
        (nm||'').toLowerCase().includes(q) ||
        (tk||'').toLowerCase().startsWith(q) ||
        (cd||'').includes(q))
    : empresas;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CVM Monitor — ${empresas.length} empresas · Documentos CVM em <1s</title>
<meta name="description" content="Monitor de documentos CVM para ${empresas.length} empresas brasileiras. Fatos relevantes, FRE, assembleias e mais de 1 milhão de documentos desde 2003.">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f2f5;color:#222;font-size:13px}
.hdr{background:#1a1a2e;color:#fff;padding:13px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}
.hdr h1{font-size:15px;font-weight:700;display:flex;align-items:center;gap:6px}
.hdr p{font-size:9px;color:#9aa;margin-top:3px}
nav{display:flex;gap:6px;flex-wrap:wrap}
nav a{color:#fff;font-size:10px;padding:4px 9px;border:1px solid rgba(255,255,255,.25);border-radius:5px;text-decoration:none;white-space:nowrap}
nav a:hover{background:rgba(255,255,255,.12)}
nav a.accent{border-color:#e74c3c;color:#ff7675}
.wrap{max-width:1300px;margin:0 auto;padding:12px}
.bar{background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.08);padding:10px 14px;margin-bottom:10px;display:flex;gap:8px}
.bar input{flex:1;border:1px solid #ddd;border-radius:6px;padding:8px 12px;font-size:13px;outline:none;transition:border .15s}
.bar input:focus{border-color:#1a1a2e}
.bar button{padding:8px 16px;background:#1a1a2e;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;white-space:nowrap}
.bar a{padding:8px 10px;border:1px solid #ddd;border-radius:6px;font-size:12px;text-decoration:none;color:#888}
.kpis{display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap}
.kpi{background:#fff;border-radius:8px;padding:10px 14px;box-shadow:0 1px 3px rgba(0,0,0,.06);text-align:center;min-width:80px}
.kpi .n{font-size:18px;font-weight:800;color:#1a1a2e}
.kpi .l{font-size:8px;color:#999;text-transform:uppercase;letter-spacing:.5px;margin-top:2px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px}
.card{background:#fff;border-radius:8px;padding:12px 13px;box-shadow:0 1px 3px rgba(0,0,0,.06);text-decoration:none;display:block;border-left:3px solid #f0f0f0;transition:all .15s}
.card:hover{box-shadow:0 3px 12px rgba(0,0,0,.12);border-left-color:#1a1a2e;transform:translateY(-1px)}
.tk{font-size:10px;font-weight:800;color:#1a1a2e;background:#eef2ff;padding:2px 6px;border-radius:3px;display:inline-block;margin-bottom:5px;letter-spacing:.3px}
.tk.priv{background:#f5f5f5;color:#aaa}
.nm{font-size:11px;color:#333;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.meta{font-size:9px;color:#bbb;margin-top:4px;display:flex;gap:6px;flex-wrap:wrap}
.empty{text-align:center;padding:60px 20px;color:#aaa}
.empty .big{font-size:36px;margin-bottom:10px}
footer{text-align:center;padding:14px;color:#bbb;font-size:9px;border-top:1px solid #eee;margin-top:14px}
footer a{color:#bbb;text-decoration:none}
@media(max-width:600px){.grid{grid-template-columns:repeat(auto-fill,minmax(160px,1fr))}}
</style>
</head>
<body>
<div class="hdr">
  <div>
    <h1>📋 CVM Monitor</h1>
    <p>${empresas.length} empresas · 1M+ docs · 2003–2026 · atualização 15min</p>
  </div>
  <nav>
    <a href="/global">📋 Todos os Docs</a>
    <a href="/aqal">📊 AQ/AL</a>
    <a href="/fechamento" class="accent">🏛 Fechamentos</a>
  </nav>
</div>

<div class="wrap">
  <form class="bar" method="GET" action="/">
    <input id="q" name="q" value="${q.replace(/"/g,'&quot;')}"
      placeholder="🔍 Ticker (PETR4) ou nome da empresa..." autocomplete="off">
    <button type="submit">Buscar</button>
    ${q ? `<a href="/">✕</a>` : ''}
  </form>

  <div class="kpis">
    <div class="kpi"><div class="n">${empresas.length}</div><div class="l">Empresas</div></div>
    <div class="kpi"><div class="n">1M+</div><div class="l">Documentos</div></div>
    <div class="kpi"><div class="n">24</div><div class="l">Anos (2003+)</div></div>
    <div class="kpi"><div class="n">15min</div><div class="l">Atualização</div></div>
    ${q ? `<div class="kpi"><div class="n">${filtered.length}</div><div class="l">Resultados</div></div>` : ''}
  </div>

  ${filtered.length === 0
    ? `<div class="empty"><div class="big">🔍</div><div>Nenhuma empresa encontrada para "${q.replace(/</g,'&lt;')}"</div></div>`
    : `<div class="grid">
      ${filtered.map(([cd, tk, nm, setor, cat]) => {
        const href = tk ? '/empresa/'+tk : '/empresa?cdcvm='+parseInt(cd);
        const tkLabel = tk || 'SEM TICKER';
        const isTkPriv = !tk;
        return '<a class="card" href="'+href+'">' +
          '<span class="tk'+(isTkPriv?' priv':'')+'">' + tkLabel + '</span>' +
          '<div class="nm">'+nm.replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</div>' +
          '<div class="meta">' +
          (setor ? '<span>'+setor.slice(0,30)+'</span>' : '') +
          '<span>cdcvm '+parseInt(cd)+'</span>' +
          '</div>' +
          '</a>';
      }).join('')}
      </div>`}
</div>

<footer>
  cvm-monitor.vercel.app · Dados CVM · Infraestrutura: Supabase + Vercel + GitHub ·
  <a href="/global">Todos os docs</a> · <a href="/aqal">AQ/AL</a>
</footer>

<script>
// Busca instantânea client-side (complementa a busca server-side)
let allEmpresas = null;
const inp = document.getElementById('q');
const grid = document.querySelector('.grid');
const kpiResult = document.querySelector('.kpis');

// Carregar JSON no background para busca instantânea
fetch('/companies_list.json').then(r=>r.json()).then(data=>{
  allEmpresas = data;
});

if(inp) {
  inp.addEventListener('input', function() {
    if (!allEmpresas) return; // ainda carregando
    const q = this.value.toLowerCase().trim();
    if (!q) { location.href = '/'; return; }
    
    const filtered = allEmpresas.filter(([cd,tk,nm]) =>
      (nm||'').toLowerCase().includes(q) ||
      (tk||'').toLowerCase().startsWith(q) ||
      (cd||'').includes(q)
    );
    
    if (grid && filtered.length > 0) {
      grid.innerHTML = filtered.slice(0,200).map(([cd,tk,nm,setor]) => {
        const href = tk ? '/empresa/'+tk : '/empresa?cdcvm='+parseInt(cd);
        return '<a class="card" href="'+href+'">' +
          '<span class="tk'+(tk?'':' priv')+'">'+(tk||'SEM TICKER')+'</span>' +
          '<div class="nm">'+nm+'</div>' +
          '<div class="meta">'+(setor?'<span>'+setor.slice(0,28)+'</span>':'')+'<span>cdcvm '+parseInt(cd)+'</span></div>' +
          '</a>';
      }).join('');
    }
  });
}
</script>
</body></html>`;

  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','s-maxage=300,stale-while-revalidate=60');
  res.status(200).send(html);
};
