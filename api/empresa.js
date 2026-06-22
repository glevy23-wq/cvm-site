// empresa.js — HTML esqueleto (< 10KB, instantâneo)
// Dados carregados via fetch assíncrono depois do DOM

export default async function handler(req, res) {
  // Resolver ticker/cdcvm do path
  const pathVal = (req.query.PATH || req.query.path || '').split('/')[0];
  const rawTicker = (req.query.ticker || req.query.t || pathVal || '').toUpperCase().trim();
  const rawCdcvm  = (req.query.cdcvm || req.query.cd || '');

  const SUPA = process.env.SUPABASE_URL || 'https://emumlldqewikrvbdfesd.supabase.co';
  const KEY  = process.env.SUPABASE_SERVICE_KEY;
  if (!KEY) { res.status(500).send('Config error'); return; }

  let cdcvm, ticker, nome, cnpj;

  console.log('DEBUG empresa.js: ticker=', rawTicker, 'supaUrl=', SUPA.slice(0,30));
  if (rawCdcvm) {
    cdcvm = rawCdcvm.replace(/-/g,'').replace(/^0+/,'').padStart(6,'0');
  } else if (rawTicker) {
    const r = await fetch(`${SUPA}/rest/v1/empresas_b3?ticker=eq.${rawTicker}&select=cdcvm,ticker,denom_social,cnpj&limit=1`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    const emp = await r.json();
    if (!emp || !emp[0]) {
      res.status(404).send(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px"><h2>Empresa não encontrada: ${rawTicker}</h2><p><a href="/">← Voltar</a></p></body></html>`);
      return;
    }
    cdcvm  = emp[0].cdcvm.replace(/-/g,'').replace(/^0+/,'').padStart(6,'0');
    ticker = emp[0].ticker;
    nome   = emp[0].denom_social;
    cnpj   = emp[0].cnpj;
  } else {
    res.status(400).send('Ticker não informado');
    return;
  }

  // HTML esqueleto — sem dados, sem rows, sem tbody pesado
  const displayName = ticker || cdcvm;
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${displayName} — CVM Monitor</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f6fa;color:#1a1a2e}
.hdr{background:#1a1a2e;color:#fff;padding:14px 20px;display:flex;align-items:center;gap:14px}
.tk{background:#e74c3c;padding:5px 14px;border-radius:6px;font-size:20px;font-weight:800}
.hi h1{font-size:15px;font-weight:600}.hi small{color:#aaa;font-size:10px}
.bk{color:#fff;font-size:20px;text-decoration:none;margin-right:4px}
.nav{background:#fff;border-bottom:2px solid #eee;padding:0 18px;display:flex;overflow-x:auto;gap:0;white-space:nowrap}
.nav span{display:inline-block;padding:10px 14px;color:#666;font-size:11px;font-weight:600;border-bottom:3px solid transparent;cursor:pointer}
.nav span.on{color:#e74c3c;border-bottom-color:#e74c3c}
.wrap{max-width:1200px;margin:0 auto;padding:16px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:10px;margin-bottom:16px}
.stat{background:#fff;border-radius:8px;padding:12px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.08)}
.stat .n{font-size:22px;font-weight:700;min-height:28px}.stat .l{font-size:9px;color:#888;margin-top:2px}
.card{background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.08);overflow:hidden;margin-bottom:16px}
.ch{padding:11px 16px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between}
.ch h2{font-size:12px;font-weight:700}
.sw{padding:8px 16px;border-bottom:1px solid #f0f0f0;display:flex;gap:8px;align-items:center}
.sw input{flex:1;padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:12px;outline:none}
.sw input:focus{border-color:#e74c3c}
.chips{padding:8px 16px;border-bottom:1px solid #f0f0f0;display:flex;flex-wrap:wrap;gap:5px}
.chip{padding:3px 9px;background:#f0f4ff;border-radius:14px;font-size:10px;cursor:pointer;border:1px solid #dde;white-space:nowrap}
.chip:hover,.chip.on{background:#1a1a2e;color:#fff;border-color:#1a1a2e}
.tbl-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:8px 12px;font-size:9px;color:#888;font-weight:700;text-transform:uppercase;letter-spacing:.5px;background:#fafafa;border-bottom:1px solid #eee;white-space:nowrap}
td{padding:7px 12px;font-size:11px;border-bottom:1px solid #f8f8f8;vertical-align:middle}
.tc{max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ta{max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#555}
tr:hover td{background:#fafafa}
.lnk{color:#1a73e8;text-decoration:none;font-size:14px}
.pager{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#fafafa;font-size:11px;color:#666;border-top:1px solid #eee}
.pbtn{padding:5px 14px;border:1px solid #ddd;border-radius:6px;cursor:pointer;background:#fff;font-size:11px}
.pbtn:hover{background:#1a1a2e;color:#fff;border-color:#1a1a2e}
.pbtn:disabled{opacity:.4;cursor:default}
.loading{text-align:center;padding:40px;color:#aaa;font-size:13px}
.skeleton{background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:200% 100%;animation:sk 1.2s infinite;border-radius:4px;height:12px;margin:4px 0}
@keyframes sk{0%{background-position:200% 0}100%{background-position:-200% 0}}
footer{text-align:center;padding:20px;color:#aaa;font-size:10px;border-top:1px solid #eee}
</style>
</head>
<body>
<div class="hdr">
  <a class="bk" href="/">←</a>
  ${ticker ? `<div class="tk">${ticker}</div>` : ''}
  <div class="hi">
    <h1 id="nome">${nome || '...'}</h1>
    <small id="meta">CDCVM ${parseInt(cdcvm)} ${cnpj ? '· CNPJ '+cnpj : ''} · carregando...</small>
  </div>
</div>

<nav class="nav" id="nav">
  <span class="on" data-cat="">📋 Todos</span>
  <span data-cat="fato relevante">🔴 Fatos Relevantes</span>
  <span data-cat="aq_al">📊 AQ/AL</span>
  <span data-cat="fre">📄 FRE</span>
  <span data-cat="dados econôm">💰 DFP/ITR</span>
  <span data-cat="assembleia">🏛 Assembleias</span>
  <span data-cat="comunicado">📢 Comunicados</span>
</nav>

<div class="wrap">
  <div class="stats" id="stats">
    ${[...Array(6)].map((_,i)=>`<div class="stat"><div class="n skeleton" style="width:60%;margin:0 auto">&nbsp;</div><div class="l skeleton" style="width:80%;margin:4px auto">&nbsp;</div></div>`).join('')}
  </div>

  <div class="card">
    <div class="ch">
      <h2>📋 Documentos CVM — ${displayName}</h2>
      <span id="count-label" style="font-size:9px;color:#aaa">carregando...</span>
    </div>
    <div class="sw">
      <input type="text" id="srch" placeholder="🔍 Buscar por categoria, assunto, data..." 
             oninput="onSearch(this.value)" autocomplete="off" autocorrect="off" spellcheck="false">
    </div>
    <div class="tbl-wrap">
      <table>
        <thead><tr>
          <th onclick="sortBy('dtreceb')" style="cursor:pointer">Entrega ↕</th>
          <th>Referência</th>
          <th>Categoria</th>
          <th>Assunto</th>
          <th title="Dias entre referência e entrega">Atraso</th>
          <th>PDF</th>
        </tr></thead>
        <tbody id="tb">
          <tr><td colspan="6" class="loading">⏳ Carregando documentos...</td></tr>
        </tbody>
      </table>
    </div>
    <div class="pager" id="pager" style="display:none">
      <button class="pbtn" id="btn-prev" onclick="changePage(-1)">← Anterior</button>
      <span id="page-info">Página 1</span>
      <button class="pbtn" id="btn-next" onclick="changePage(1)">Próxima →</button>
    </div>
  </div>
</div>

<footer>cvm-monitor.vercel.app · CVM ENET · Zero IA · <a href="/" style="color:#aaa">← Todas empresas</a></footer>

<script>
const CDCVM = '${cdcvm}';
const PAGE_SIZE = 200;
let allDocs = [];
let filtered = [];
let currentPage = 0;
let activeFilter = '';
let activeSearch = '';
let sortDir = -1; // -1 = desc (mais recente primeiro)

// Carregar dados via fetch — não bloqueia o render
async function loadData() {
  try {
    const url = '/empresa-data?cdcvm=' + CDCVM;
    const resp = await fetch(url);
    const data = await resp.json();
    
    allDocs = data.filings || [];
    
    // Actualizar stats
    const stats = data.stats || {};
    document.getElementById('stats').innerHTML = [
      [allDocs.length.toLocaleString('pt-BR'), 'Docs CVM'],
      [stats.anos || '?', 'Anos'],
      [stats.desde || '?', 'Desde'],
      [stats.fr || 0, 'Fatos Relevantes'],
      [stats.fre || 0, 'FREs'],
      [stats.assembleia || 0, 'Assembleias'],
    ].map(([n,l]) => '<div class="stat"><div class="n">'+n+'</div><div class="l">'+l+'</div></div>').join('');

    // Actualizar meta
    document.getElementById('meta').textContent = 
      'CDCVM ${parseInt(cdcvm)} ${cnpj ? "· CNPJ "+cnpj : ""} · ' + allDocs.length.toLocaleString('pt-BR') + ' documentos · 2003–2026';

    // Actualizar nav com contadores
    const cats = {};
    for (const f of allDocs) {
      const c = (f.c || '').toLowerCase();
      if (c.includes('fato relevante')) cats.fr = (cats.fr||0)+1;
      if (c.includes('valores mobili') || c.includes('vlmo') || c.includes('aq') || c.includes('al')) cats.aqal = (cats.aqal||0)+1;
      if (c.includes('formulário de referência') || c === 'fre') cats.fre = (cats.fre||0)+1;
      if (c.includes('dados econôm') || c.includes('dfp') || c.includes('itr')) cats.dfp = (cats.dfp||0)+1;
      if (c.includes('assembleia')) cats.asm = (cats.asm||0)+1;
      if (c.includes('comunicado')) cats.com = (cats.com||0)+1;
    }
    const nav = document.getElementById('nav');
    const spans = nav.querySelectorAll('span');
    const labels = [
      '📋 Todos ('+allDocs.length.toLocaleString('pt-BR')+')',
      '🔴 Fatos Relevantes ('+(cats.fr||0)+')',
      '📊 AQ/AL ('+(cats.aqal||0)+')',
      '📄 FRE ('+(cats.fre||0)+')',
      '💰 DFP/ITR ('+(cats.dfp||0)+')',
      '🏛 Assembleias ('+(cats.asm||0)+')',
      '📢 Comunicados ('+(cats.com||0)+')',
    ];
    spans.forEach((s,i) => { if(labels[i]) s.textContent = labels[i]; });

    applyFilter();
    
  } catch(e) {
    document.getElementById('tb').innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#e74c3c">Erro ao carregar dados: ' + e.message + '</td></tr>';
  }
}

function applyFilter() {
  const q = activeSearch.toLowerCase();
  const cat = activeFilter;
  
  filtered = allDocs.filter(f => {
    const fc = (f.c || '').toLowerCase();
    const fa = (f.a || '').toLowerCase();
    const fd = (f.d || '');
    
    // Filtro tab
    let tabOk = true;
    if (cat) {
      if (cat === 'aq_al') {
        tabOk = fc.includes('valores mobili') || fc.includes('vlmo');
      } else if (cat === 'fre') {
        tabOk = fc.includes('formulário de referência') || fc === 'fre' || fc.includes('referência anual');
      } else {
        tabOk = fc.includes(cat) || fa.includes(cat);
      }
    }
    
    // Busca full text
    const qOk = !q || fc.includes(q) || fa.includes(q) || fd.includes(q);
    
    return tabOk && qOk;
  });
  
  currentPage = 0;
  renderPage();
}

function renderPage() {
  const start = currentPage * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const page = filtered.slice(start, end);
  const total = filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  
  // Actualizar contador
  document.getElementById('count-label').textContent = 
    (activeSearch || activeFilter) 
      ? total.toLocaleString('pt-BR') + ' de ' + allDocs.length.toLocaleString('pt-BR') + ' docs'
      : allDocs.length.toLocaleString('pt-BR') + ' docs';

  if (page.length === 0) {
    document.getElementById('tb').innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:#888">Nenhum documento encontrado</td></tr>';
    document.getElementById('pager').style.display = 'none';
    return;
  }
  
  // Gerar rows (só 200 de cada vez)
  const rows = page.map(f => {
    const dt  = (f.d || '').slice(0,10);
    const dtr = (f.r || '').slice(0,10);
    const cat = f.c || '-';
    const ass = (f.a || '').slice(0,80);
    const lnk = f.l || '';
    const atr = f.ad != null ? '<span style="color:#888;font-size:10px">'+f.ad+'d</span>' : '';
    const imp = f.i || '';
    const badge = imp === 'alto' ? '<span style="color:#e74c3c">●</span> ' : imp === 'super' ? '🔴 ' : '';
    const catShort = cat.length > 50 ? cat.slice(0,50)+'…' : cat;
    const assShort = ass.length > 80 ? ass.slice(0,80)+'…' : ass;
    return '<tr><td>'+dt+'</td><td>'+dtr+'</td><td class="tc">'+badge+catShort+'</td><td class="ta">'+assShort+'</td><td>'+atr+'</td><td>'+(lnk?'<a class="lnk" href="'+lnk+'" target="_blank">📄</a>':'')+'</td></tr>';
  }).join('');
  
  document.getElementById('tb').innerHTML = rows;
  
  // Pager
  document.getElementById('pager').style.display = 'flex';
  document.getElementById('page-info').textContent = 
    'Página ' + (currentPage+1) + ' de ' + totalPages + 
    ' (' + start + '-' + Math.min(end,total) + ' de ' + total.toLocaleString('pt-BR') + ')';
  document.getElementById('btn-prev').disabled = currentPage === 0;
  document.getElementById('btn-next').disabled = currentPage >= totalPages - 1;
}

function changePage(dir) {
  currentPage += dir;
  renderPage();
  window.scrollTo({top: document.querySelector('.card').offsetTop - 10, behavior: 'smooth'});
}

let searchTimer;
function onSearch(q) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    activeSearch = q.trim();
    applyFilter();
  }, 200); // debounce 200ms
}

function sortBy(field) {
  sortDir *= -1;
  if (field === 'dtreceb') {
    allDocs.sort((a,b) => sortDir * (a.d||'').localeCompare(b.d||''));
    filtered.sort((a,b) => sortDir * (a.d||'').localeCompare(b.d||''));
    renderPage();
  }
}

// Nav clicks
document.getElementById('nav').addEventListener('click', e => {
  const t = e.target.closest('span');
  if (!t) return;
  document.querySelectorAll('.nav span').forEach(s => s.classList.remove('on'));
  t.classList.add('on');
  activeFilter = t.dataset.cat || '';
  activeSearch = '';
  document.getElementById('srch').value = '';
  applyFilter();
});

// Iniciar carregamento
loadData();
</script>
</body></html>`;

  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','s-maxage=600,stale-while-revalidate=60');
  res.status(200).send(html);
}
