// empresa.js v4 — search, HTML+PDF, tipo, especie, versao, reapresentacao

export default async function handler(req, res) {
  const pathVal = (req.query.PATH || req.query.path || '').split('/')[0];
  const rawTicker = (req.query.ticker || req.query.t || pathVal || '').toUpperCase().trim();
  const rawCdcvm  = (req.query.cdcvm || req.query.cd || '');

  const SUPA = process.env.SUPABASE_URL || 'https://emumlldqewikrvbdfesd.supabase.co';
  const KEY  = process.env.SUPABASE_SERVICE_KEY;
  if (!KEY) { res.status(500).send('Config error'); return; }

  let cdcvm, ticker, nome, cnpj;

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
    res.status(400).send('Ticker não informado'); return;
  }

  const displayName = ticker || cdcvm;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${displayName} — Documentos CVM</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f6fa;color:#1a1a2e;font-size:13px}
/* Header */
.hdr{background:#1a1a2e;color:#fff;padding:12px 20px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.tk{background:#e74c3c;padding:4px 13px;border-radius:6px;font-size:19px;font-weight:800;letter-spacing:1px}
.nm{font-size:13px;font-weight:600;flex:1}
.bk{color:#aaa;text-decoration:none;font-size:18px}
/* Stats */
.stats{display:flex;gap:10px;padding:12px 16px;overflow-x:auto;background:#fff;border-bottom:1px solid #eee}
.stat{text-align:center;min-width:70px}
.stat .n{font-size:20px;font-weight:800;color:#1a1a2e}
.stat .l{font-size:9px;color:#888;margin-top:1px;text-transform:uppercase}
/* Nav */
.nav{background:#fff;border-bottom:2px solid #eee;display:flex;overflow-x:auto;white-space:nowrap;padding:0 12px}
.nav span{display:inline-block;padding:9px 13px;color:#666;font-size:10.5px;font-weight:600;border-bottom:3px solid transparent;cursor:pointer;text-transform:uppercase;letter-spacing:.3px}
.nav span.on{color:#e74c3c;border-bottom-color:#e74c3c}
/* Search */
.srch{display:flex;align-items:center;gap:8px;padding:8px 14px;background:#fff;border-bottom:1px solid #f0f0f0}
.srch input{flex:1;padding:7px 12px;border:1.5px solid #ddd;border-radius:7px;font-size:12px;outline:none}
.srch input:focus{border-color:#e74c3c}
.meta{font-size:10px;color:#999;white-space:nowrap}
/* Chips */
.chips{display:flex;flex-wrap:wrap;gap:5px;padding:7px 14px;background:#fff;border-bottom:1px solid #f0f0f0}
.chip{padding:3px 9px;background:#f0f4ff;border-radius:14px;font-size:10px;cursor:pointer;border:1px solid #dde}
.chip.on{background:#1a1a2e;color:#fff;border-color:#1a1a2e}
/* Table */
.card{background:#fff;border-radius:8px;margin:12px 14px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06)}
.tbl-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse}
th{background:#f9fafb;padding:7px 10px;font-size:9px;color:#666;font-weight:700;text-transform:uppercase;text-align:left;border-bottom:2px solid #eee;cursor:pointer;white-space:nowrap}
th:hover{background:#f0f4ff}
td{padding:7px 10px;border-bottom:1px solid #f5f5f5;vertical-align:middle;font-size:11.5px}
tr:hover td{background:#fafafa}
/* Reapresentação — destaque */
tr.reap td{background:#fff8e1}
tr.reap.inativo td{background:#ffeaea}
tr.inativo td{background:#ffeaea}
.vs{font-size:10px;font-weight:700;padding:2px 6px;border-radius:10px;display:inline-block}
.vs.v1{background:#e8f5e9;color:#2e7d32}
.vs.vn{background:#fff3e0;color:#e65100}
.vs.vi{background:#fce4ec;color:#c62828}
.st{font-size:9px;padding:2px 6px;border-radius:8px;font-weight:600}
.st.ativo{background:#e8f5e9;color:#2e7d32}
.st.inativo{background:#fce4ec;color:#c62828}
/* Links */
.lnk{display:inline-flex;align-items:center;gap:3px;padding:3px 8px;border-radius:5px;font-size:10px;font-weight:600;text-decoration:none;white-space:nowrap}
.lnk.htm{background:#e3f2fd;color:#1565c0}
.lnk.htm:hover{background:#1565c0;color:#fff}
.lnk.pdf{background:#fce4ec;color:#c62828}
.lnk.pdf:hover{background:#c62828;color:#fff}
/* Pager */
.pager{display:flex;align-items:center;justify-content:center;gap:8px;padding:10px;font-size:11px;color:#888}
.pager button{padding:4px 12px;border:1px solid #ddd;border-radius:5px;background:#fff;cursor:pointer;font-size:11px}
.pager button:hover{background:#1a1a2e;color:#fff;border-color:#1a1a2e}
.pager button:disabled{opacity:.4;cursor:default}
/* Empty */
.empty{text-align:center;padding:40px;color:#aaa;font-size:13px}
/* Loading */
.loading{text-align:center;padding:40px;color:#888}
</style>
</head>
<body>

<div class="hdr">
  <a class="bk" href="/">←</a>
  <div class="tk">${displayName}</div>
  <div class="nm">${nome || ''}<br><small style="color:#777;font-size:9px">CDCVM ${cdcvm}${cnpj ? ' · CNPJ ' + cnpj : ''}</small></div>
</div>

<div class="stats" id="stats">
  <div class="stat"><div class="n" id="st-total">…</div><div class="l">Docs</div></div>
  <div class="stat"><div class="n" id="st-anos">…</div><div class="l">Anos</div></div>
  <div class="stat"><div class="n" id="st-desde">…</div><div class="l">Desde</div></div>
  <div class="stat"><div class="n" id="st-fr">…</div><div class="l">Fatos Rel.</div></div>
  <div class="stat"><div class="n" id="st-fre">…</div><div class="l">FREs</div></div>
  <div class="stat"><div class="n" id="st-asm">…</div><div class="l">Assembleias</div></div>
</div>

<div class="nav" id="nav">
  <span class="on" data-f="">📋 Todos</span>
  <span data-f="fr">🔴 Fatos Relevantes</span>
  <span data-f="aqal">📊 AQ/AL</span>
  <span data-f="fre">📄 FRE</span>
  <span data-f="dfp">💰 DFP/ITR</span>
  <span data-f="asm">🏛 Assembleias</span>
  <span data-f="com">📢 Comunicados</span>
  <span data-f="reap">🔄 Reapresentados</span>
</div>

<div class="srch">
  <input id="q" type="search" placeholder="Buscar no assunto, categoria, tipo…" autocomplete="off">
  <div class="meta" id="meta">Carregando…</div>
</div>

<div class="chips" id="anos-chips"></div>

<div class="card">
  <div class="tbl-wrap">
    <table>
      <thead>
        <tr>
          <th onclick="sortBy('d')">Data ↕</th>
          <th>Hora</th>
          <th onclick="sortBy('r')">Referência</th>
          <th onclick="sortBy('c')">Categoria</th>
          <th>Tipo</th>
          <th>Espécie</th>
          <th>Assunto</th>
          <th>V</th>
          <th>Status</th>
          <th>Motivo Reapres.</th>
          <th>HTML</th>
          <th>PDF</th>
        </tr>
      </thead>
      <tbody id="tb"><tr><td colspan="12" class="loading">⏳ Carregando…</td></tr></tbody>
    </table>
  </div>
  <div class="pager" id="pager"></div>
</div>

<script>
const CDCVM = '${cdcvm}';
const PG = 100;
let all = [], filtered = [], page = 0;
let sortCol = 'd', sortAsc = false;
let activeTab = '', activeSearch = '', activeAno = '';

async function load() {
  try {
    const resp = await fetch('/empresa-data?cdcvm=' + CDCVM);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    all = data.filings || [];
    const s = data.stats || {};
    // Stats
    document.getElementById('st-total').textContent = all.length.toLocaleString('pt-BR');
    document.getElementById('st-anos').textContent = s.anos || '?';
    document.getElementById('st-desde').textContent = s.desde || '?';
    document.getElementById('st-fr').textContent = s.fr || 0;
    document.getElementById('st-fre').textContent = s.fre || 0;
    document.getElementById('st-asm').textContent = s.assembleia || 0;
    // Anos chips
    const anos = [...new Set(all.map(f=>(f.d||'').slice(0,4)).filter(Boolean))].sort().reverse();
    const cc = document.getElementById('anos-chips');
    cc.innerHTML = anos.map(a =>
      '<span class="chip" data-a="'+a+'" onclick="setAno(\''+a+'\')">'+a+'</span>'
    ).join('');
    apply();
  } catch(e) {
    document.getElementById('tb').innerHTML = '<tr><td colspan="12" class="empty">Erro: ' + e.message + '</td></tr>';
  }
}

function apply() {
  const q = (document.getElementById('q').value || '').toLowerCase();
  filtered = all.filter(f => {
    const c = (f.c||'').toLowerCase();
    // Tab
    let tok = true;
    if (activeTab === 'fr') tok = c.includes('fato relevante');
    else if (activeTab === 'aqal') tok = c.includes('aquisição') || c.includes('alienação') || c.includes('valores mobili');
    else if (activeTab === 'fre') tok = c.includes('formulário de referência');
    else if (activeTab === 'dfp') tok = c.includes('dados econôm') || c === 'dfp' || c === 'itr';
    else if (activeTab === 'asm') tok = c.includes('assembleia');
    else if (activeTab === 'com') tok = c.includes('comunicado');
    else if (activeTab === 'reap') tok = f.ri === 1 || f.v > 1;
    if (!tok) return false;
    // Ano
    if (activeAno && !(f.d||'').startsWith(activeAno)) return false;
    // Busca
    if (q && !( (f.a||'').toLowerCase().includes(q) || c.includes(q) || (f.t||'').toLowerCase().includes(q) || (f.e||'').toLowerCase().includes(q) )) return false;
    return true;
  });
  // Sort
  filtered.sort((a,b) => {
    let va = a[sortCol]||'', vb = b[sortCol]||'';
    if (sortCol==='d') { va = (a.d||'')+(a.h||''); vb = (b.d||'')+(b.h||''); }
    return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
  });
  page = 0;
  renderMeta();
  renderTable();
  renderPager();
}

function renderMeta() {
  document.getElementById('meta').textContent =
    filtered.length.toLocaleString('pt-BR') + ' / ' + all.length.toLocaleString('pt-BR') + ' docs';
}

function renderTable() {
  const slice = filtered.slice(page*PG, (page+1)*PG);
  if (!slice.length) {
    document.getElementById('tb').innerHTML = '<tr><td colspan="12" class="empty">Nenhum documento encontrado</td></tr>';
    return;
  }
  document.getElementById('tb').innerHTML = slice.map(f => {
    const isReap  = f.ri === 1 || f.v > 1;
    const isInativ = (f.s||'').toLowerCase() === 'inativo' || (f.s||'').toLowerCase() === 'cancelado';
    const trClass = [isReap ? 'reap' : '', isInativ ? 'inativo' : ''].filter(Boolean).join(' ');
    const v = f.v || 1;
    const vClass = isInativ ? 'vi' : v > 1 ? 'vn' : 'v1';
    const stClass = isInativ ? 'inativo' : 'ativo';
    const stLabel = f.s || 'Ativo';
    const tipo   = f.t || '';
    const especie = f.e || '';
    const motivo = f.m ? ('<span style="color:#e65100;font-size:10px">'+escHtml(f.m.slice(0,60))+'</span>') : '';
    // Links
    const lh = f.lh || '';
    const lp = f.lp || f.lh || '';
    const linkHtml = lh ? '<a class="lnk htm" href="'+escHtml(lh)+'" target="_blank" rel="noopener">🌐 HTML</a>' : '<span style="color:#ccc;font-size:10px">—</span>';
    const linkPdf  = lp ? '<a class="lnk pdf" href="'+escHtml(lp)+'" target="_blank" rel="noopener">📄 PDF</a>' : '<span style="color:#ccc;font-size:10px">—</span>';
    return \`<tr class="\${trClass}">
      <td><b>\${f.d||'?'}</b></td>
      <td style="color:#888">\${f.h||''}</td>
      <td style="color:#666">\${(f.r||'').slice(0,7)}</td>
      <td><b>\${escHtml(f.c||'')}</b></td>
      <td style="color:#555">\${escHtml(tipo)}</td>
      <td style="color:#777">\${escHtml(especie)}</td>
      <td>\${escHtml((f.a||'').slice(0,90))}</td>
      <td><span class="vs \${vClass}">v\${v}</span></td>
      <td><span class="st \${stClass}">\${escHtml(stLabel)}</span></td>
      <td>\${motivo}</td>
      <td>\${linkHtml}</td>
      <td>\${linkPdf}</td>
    </tr>\`;
  }).join('');
}

function renderPager() {
  const total = Math.ceil(filtered.length / PG);
  if (total <= 1) { document.getElementById('pager').innerHTML=''; return; }
  document.getElementById('pager').innerHTML =
    '<button onclick="goPage(-1)" '+(page===0?'disabled':'')+'>← Anterior</button>' +
    '<span>Página '+(page+1)+' / '+total+'</span>' +
    '<button onclick="goPage(1)" '+(page>=total-1?'disabled':'')+'>Próxima →</button>';
}

function goPage(d) { page = Math.max(0, page+d); renderTable(); renderPager(); window.scrollTo(0,200); }

function sortBy(col) {
  if (sortCol === col) sortAsc = !sortAsc; else { sortCol = col; sortAsc = false; }
  apply();
}

function setAno(a) {
  activeAno = activeAno === a ? '' : a;
  document.querySelectorAll('.chip[data-a]').forEach(c => c.classList.toggle('on', c.dataset.a===activeAno));
  apply();
}

function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Nav tabs
document.querySelectorAll('.nav span').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.nav span').forEach(e=>e.classList.remove('on'));
    el.classList.add('on');
    activeTab = el.dataset.f || '';
    apply();
  });
});

// Search
document.getElementById('q').addEventListener('input', () => { apply(); });

load();
</script>
</body>
</html>`;

  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','s-maxage=60,stale-while-revalidate=300');
  res.status(200).send(html);
}
