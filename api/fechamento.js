
module.exports = async (req, res) => {
  // Stats que passamos inline (calculadas no build)
  const STATS = {
    total: 1439,
    voluntario: 393,
    opa_cvm: 405,
    incorporacao: 291,
    oficio: 350,
    ainda_ativa: 49,
    com_laudos: 22
  };

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fechamento de Capital — CVM Monitor</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f2f5;color:#222;font-size:13px}
.hdr{background:#1a1a2e;color:#fff;padding:14px 20px;display:flex;align-items:center;gap:14px}
.hdr-title{font-size:16px;font-weight:800;letter-spacing:-.2px}
.hdr-sub{font-size:10px;color:#aaa;margin-top:3px}
.bk{color:#fff;font-size:20px;text-decoration:none}
.wrap{max-width:1400px;margin:0 auto;padding:14px}

/* STATS BAR */
.stats-bar{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:14px}
.stat-box{background:#fff;border-radius:8px;padding:10px 14px;box-shadow:0 1px 3px rgba(0,0,0,.08);text-align:center;border-left:4px solid #ccc}
.stat-box .n{font-size:22px;font-weight:800;line-height:1}
.stat-box .l{font-size:9px;color:#888;margin-top:4px}

/* FILTROS */
.filtros{background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.08);padding:12px 16px;margin-bottom:12px}
.filtros h3{font-size:10px;font-weight:700;text-transform:uppercase;color:#888;margin-bottom:10px;letter-spacing:.5px}
.toggle-group{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
.toggle-btn{display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border-radius:20px;font-size:10px;font-weight:700;cursor:pointer;border:2px solid transparent;transition:all .15s;user-select:none}
.toggle-btn .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.toggle-btn.off{background:#f5f5f5;border-color:#ddd;color:#999}
.toggle-btn.off .dot{background:#ddd}
.toggle-btn.on{border-color:currentColor}
.search-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.search-row input{flex:1;min-width:200px;padding:7px 12px;border:1px solid #ddd;border-radius:6px;font-size:12px;outline:none}
.search-row input:focus{border-color:#1a1a2e}
.search-row select{padding:7px 10px;border:1px solid #ddd;border-radius:6px;font-size:11px;background:#fff;outline:none}
.counter{font-size:10px;color:#888;margin-left:4px}

/* LISTA */
.list-wrap{display:flex;flex-direction:column;gap:8px}
.empresa-card{background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.08);overflow:hidden;border-left:5px solid #ccc}
.empresa-card .card-hdr{padding:10px 14px;display:flex;align-items:center;gap:10px;cursor:pointer;transition:background .1s}
.empresa-card .card-hdr:hover{background:#fafafa}
.empresa-card .card-body{display:none;padding:12px 16px;background:#fafafa;border-top:1px solid #eee}
.empresa-card.open .card-body{display:block}
.empresa-card .card-hdr .badge-cat{padding:3px 8px;border-radius:12px;font-size:9px;font-weight:700;color:#fff;white-space:nowrap;flex-shrink:0}
.empresa-card .card-hdr .badge-status{padding:3px 8px;border-radius:12px;font-size:9px;font-weight:600;white-space:nowrap;flex-shrink:0;border:1px solid}
.empresa-card .card-hdr .nome{font-weight:700;font-size:12px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.empresa-card .card-hdr .dt{font-size:10px;color:#999;white-space:nowrap}
.empresa-card .card-hdr .n-laudos{font-size:9px;background:#fff7e6;border:1px solid #ffd591;color:#d46b08;padding:2px 7px;border-radius:10px;white-space:nowrap}
.empresa-card .card-hdr .arrow{font-size:12px;color:#bbb;flex-shrink:0;transition:transform .2s}
.empresa-card.open .card-hdr .arrow{transform:rotate(90deg)}

/* CARD BODY */
.detail-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-bottom:12px}
.detail-item .lbl{font-size:9px;color:#888;font-weight:700;text-transform:uppercase;margin-bottom:2px}
.detail-item .val{font-size:11px;font-weight:500}
.laudos-section{margin-top:10px}
.laudos-section h4{font-size:10px;font-weight:700;color:#666;margin-bottom:8px;text-transform:uppercase}
.laudo-row{display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid #eee}
.laudo-row:last-child{border-bottom:none}
.laudo-row .data{font-size:10px;color:#888;white-space:nowrap;width:75px;flex-shrink:0}
.laudo-row .tipo{font-size:10px;font-weight:600;color:#1a1a2e;width:130px;flex-shrink:0}
.laudo-row .assunto{font-size:10px;color:#555;flex:1}
.laudo-row .link-btn{padding:3px 9px;background:#1a73e8;color:#fff;border-radius:4px;font-size:9px;text-decoration:none;white-space:nowrap;flex-shrink:0}
.filing-badge{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:12px;font-size:10px;font-weight:600;margin-top:8px;border:1px solid}
.no-laudos{font-size:10px;color:#aaa;font-style:italic;padding:8px 0}
.pager{display:flex;align-items:center;justify-content:space-between;padding:10px 0;margin-top:10px}
.pbtn{padding:6px 16px;border:1px solid #ddd;border-radius:6px;cursor:pointer;background:#fff;font-size:11px}
.pbtn:hover{background:#1a1a2e;color:#fff;border-color:#1a1a2e}
.pbtn:disabled{opacity:.4;cursor:default}
footer{text-align:center;padding:16px;color:#aaa;font-size:10px;border-top:1px solid #eee;margin-top:16px}
.loading-msg{text-align:center;padding:40px;color:#aaa;font-size:13px}
</style>
</head>
<body>
<div class="hdr">
  <a class="bk" href="/">←</a>
  <div>
    <div class="hdr-title">🏛 Fechamento de Capital</div>
    <div class="hdr-sub">${STATS.total.toLocaleString('pt-BR')} empresas · voluntário, OPA, incorporação, ofício · com laudos de avaliação</div>
  </div>
</div>

<div class="wrap">
  <!-- STATS BAR -->
  <div class="stats-bar">
    <div class="stat-box" style="border-color:#e74c3c"><div class="n" style="color:#e74c3c">${STATS.voluntario}</div><div class="l">Fechamento Voluntário</div></div>
    <div class="stat-box" style="border-color:#c0392b"><div class="n" style="color:#c0392b">${STATS.opa_cvm}</div><div class="l">OPA por Instrução CVM</div></div>
    <div class="stat-box" style="border-color:#e67e22"><div class="n" style="color:#e67e22">${STATS.incorporacao}</div><div class="l">Incorporação/Fusão</div></div>
    <div class="stat-box" style="border-color:#8e44ad"><div class="n" style="color:#8e44ad">${STATS.oficio}</div><div class="l">Cancelamento de Ofício</div></div>
    <div class="stat-box" style="border-color:#27ae60"><div class="n" style="color:#27ae60">${STATS.ainda_ativa}</div><div class="l">Ainda Enviam Filings</div></div>
    <div class="stat-box" style="border-color:#f39c12"><div class="n" style="color:#f39c12">${STATS.com_laudos}</div><div class="l">Com Laudos de Avaliação</div></div>
  </div>

  <!-- FILTROS -->
  <div class="filtros">
    <h3>🎯 Filtrar por tipo de fechamento</h3>
    <div class="toggle-group" id="cat-toggles">
      <span class="toggle-btn on" data-cat="fechou_voluntario" style="color:#e74c3c;background:#fef0f0;border-color:#e74c3c" onclick="toggleCat(this)">
        <span class="dot" style="background:#e74c3c"></span> Fechamento Voluntário (OPA)
      </span>
      <span class="toggle-btn on" data-cat="cancelamento_cvm_opa" style="color:#c0392b;background:#fdf0f0;border-color:#c0392b" onclick="toggleCat(this)">
        <span class="dot" style="background:#c0392b"></span> OPA — CVM 361/2002
      </span>
      <span class="toggle-btn on" data-cat="cancelamento_cvm_229" style="color:#c0392b;background:#fdf0f0;border-color:#c0392b" onclick="toggleCat(this)">
        <span class="dot" style="background:#c0392b"></span> OPA — CVM 229/1995
      </span>
      <span class="toggle-btn off" data-cat="incorporacao" style="color:#e67e22" onclick="toggleCat(this)">
        <span class="dot" style="background:#e67e22"></span> Incorporação/Fusão
      </span>
      <span class="toggle-btn off" data-cat="cancelamento_oficio" style="color:#8e44ad" onclick="toggleCat(this)">
        <span class="dot" style="background:#8e44ad"></span> Cancelamento de Ofício
      </span>
      <span class="toggle-btn off" data-cat="cancelamento_cvm_078" style="color:#7f8c8d" onclick="toggleCat(this)">
        <span class="dot" style="background:#7f8c8d"></span> CVM 03/78 (pré-1995)
      </span>
    </div>

    <h3 style="margin-top:10px">📡 Filtrar por status de filings</h3>
    <div class="toggle-group" id="status-toggles">
      <span class="toggle-btn on" data-status="muito_ativa" style="color:#27ae60;background:#f0fdf4;border-color:#27ae60" onclick="toggleStatus(this)">
        <span class="dot" style="background:#27ae60"></span> Ainda muito ativa (20+ docs/ano)
      </span>
      <span class="toggle-btn on" data-status="ativa" style="color:#f39c12;background:#fffbf0;border-color:#f39c12" onclick="toggleStatus(this)">
        <span class="dot" style="background:#f39c12"></span> Ainda ativa (alguns docs)
      </span>
      <span class="toggle-btn on" data-status="pouca" style="color:#e67e22;background:#fff5f0;border-color:#e67e22" onclick="toggleStatus(this)">
        <span class="dot" style="background:#e67e22"></span> Poucos docs recentes
      </span>
      <span class="toggle-btn off" data-status="parou" style="color:#95a5a6" onclick="toggleStatus(this)">
        <span class="dot" style="background:#95a5a6"></span> Parou de enviar filings
      </span>
    </div>

    <div class="search-row" style="margin-top:12px">
      <input type="text" id="q" placeholder="🔍 Buscar empresa..." oninput="onSearch(this.value)" autocomplete="off">
      <select id="ano-filter" onchange="applyFilter()">
        <option value="">Qualquer ano</option>
        ${[2026,2025,2024,2023,2022,2021,2020,2019,2018,2015,2010,2005,2000].map(y=>`<option value="${y}">${y}</option>`).join('')}
      </select>
      <select id="sort-by" onchange="applyFilter()">
        <option value="dt_desc">Mais recente primeiro</option>
        <option value="dt_asc">Mais antigo primeiro</option>
        <option value="filings_desc">Mais filings recentes</option>
        <option value="laudos_desc">Mais laudos</option>
      </select>
      <span id="counter" class="counter">carregando...</span>
    </div>
  </div>

  <!-- LISTA -->
  <div id="list" class="list-wrap">
    <div class="loading-msg">⏳ Carregando dados...</div>
  </div>
  <div class="pager" id="pager" style="display:none">
    <button class="pbtn" id="btn-prev" onclick="changePage(-1)">← Anterior</button>
    <span id="page-info" style="font-size:11px;color:#666"></span>
    <button class="pbtn" id="btn-next" onclick="changePage(1)">Próxima →</button>
  </div>
</div>

<footer>cvm-monitor.vercel.app · Dados: CVM FCA + IPE · Zero IA · <a href="/" style="color:#aaa">← Início</a></footer>

<script>
const PAGE_SIZE = 50;
let allData = [];
let filtered = [];
let page = 0;
let activeCats = new Set(['fechou_voluntario','cancelamento_cvm_opa','cancelamento_cvm_229']);
let activeStatus = new Set(['muito_ativa','ativa','pouca']);
let searchQ = '';
let anoFilter = '';
let sortBy = 'dt_desc';

// Cores por categoria
const CAT_COLORS = {
  'fechou_voluntario': '#e74c3c',
  'cancelamento_cvm_opa': '#c0392b',
  'cancelamento_cvm_229': '#c0392b',
  'cancelamento_cvm_078': '#7f8c8d',
  'incorporacao': '#e67e22',
  'cancelamento_oficio': '#8e44ad',
  'migracao': '#3498db',
  'extincao': '#2c3e50',
  'liquidacao': '#2c3e50',
  'transformacao': '#16a085',
};

const STATUS_COLORS = {
  'muito_ativa': '#27ae60',
  'ativa': '#f39c12',
  'pouca': '#e67e22',
  'parou': '#95a5a6',
};

const STATUS_ICONS = {
  'muito_ativa': '🟢',
  'ativa': '🟡',
  'pouca': '🟠',
  'parou': '⚫',
};

async function loadData() {
  try {
    const resp = await fetch('/companies_closed.json');
    allData = await resp.json();
    applyFilter();
  } catch(e) {
    document.getElementById('list').innerHTML = '<div class="loading-msg" style="color:#e74c3c">Erro ao carregar dados: ' + e.message + '</div>';
  }
}

function applyFilter() {
  anoFilter = document.getElementById('ano-filter').value;
  sortBy = document.getElementById('sort-by').value;
  const q = searchQ.toLowerCase();
  
  filtered = allData.filter(c => {
    // Cat filter
    if (!activeCats.has(c.cat)) return false;
    // Status filter
    if (!activeStatus.has(c.status)) return false;
    // Ano filter
    if (anoFilter && c.dt && !c.dt.startsWith(anoFilter)) return false;
    // Search
    if (q && !c.nome.toLowerCase().includes(q) && !c.cd.includes(q) && !(c.setor||'').toLowerCase().includes(q)) return false;
    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    if (sortBy === 'dt_desc') return (b.dt || '').localeCompare(a.dt || '');
    if (sortBy === 'dt_asc')  return (a.dt || '').localeCompare(b.dt || '');
    if (sortBy === 'filings_desc') return (b.n_filings||0) - (a.n_filings||0);
    if (sortBy === 'laudos_desc') return (b.n_laudos||0) - (a.n_laudos||0);
    return 0;
  });

  page = 0;
  document.getElementById('counter').textContent = filtered.length.toLocaleString('pt-BR') + ' empresas';
  renderPage();
}

function renderPage() {
  const start = page * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const slice = filtered.slice(start, end);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  if (slice.length === 0) {
    document.getElementById('list').innerHTML = '<div class="loading-msg">Nenhuma empresa encontrada. Ajuste os filtros.</div>';
    document.getElementById('pager').style.display = 'none';
    return;
  }

  document.getElementById('list').innerHTML = slice.map(c => renderCard(c)).join('');
  
  // Pager
  document.getElementById('pager').style.display = 'flex';
  document.getElementById('page-info').textContent = 
    'Página ' + (page+1) + ' / ' + totalPages + ' (' + filtered.length.toLocaleString('pt-BR') + ' empresas)';
  document.getElementById('btn-prev').disabled = page === 0;
  document.getElementById('btn-next').disabled = page >= totalPages - 1;
}

function renderCard(c) {
  const cor = CAT_COLORS[c.cat] || '#ccc';
  const statusCor = STATUS_COLORS[c.status] || '#ccc';
  const statusIcon = STATUS_ICONS[c.status] || '⚫';
  const dtFormatted = c.dt ? c.dt.slice(0,7).replace('-','/') : '—';
  const setor = c.setor || '';
  const motivo = c.motivo || '';
  
  const laudosHtml = c.laudos && c.laudos.length > 0 
    ? '<div class="laudos-section"><h4>📄 Laudos de Avaliação (' + c.n_laudos + ')</h4>' +
      c.laudos.map(l => 
        '<div class="laudo-row">' +
        '<span class="data">' + (l.data||'').slice(0,10) + '</span>' +
        '<span class="tipo">' + (l.tipo||'').slice(0,35) + '</span>' +
        '<span class="assunto">' + (l.assunto||'').slice(0,70) + '</span>' +
        (l.link ? '<a class="link-btn" href="' + l.link + '" target="_blank">📄 PDF</a>' : '') +
        '</div>'
      ).join('') + '</div>'
    : '<p class="no-laudos">Sem laudos de avaliação registrados</p>';
  
  return '<div class="empresa-card" style="border-left-color:' + cor + '" id="card-' + c.cd + '">' +
    '<div class="card-hdr" onclick="toggleCard(\'' + c.cd + '\')">' +
    '<span class="badge-cat" style="background:' + cor + '">' + c.cat_label + '</span>' +
    '<span class="nome">' + c.nome + '</span>' +
    (c.n_laudos > 0 ? '<span class="n-laudos">🔎 ' + c.n_laudos + ' laudo' + (c.n_laudos>1?'s':'') + '</span>' : '') +
    '<span class="badge-status" style="color:' + statusCor + ';border-color:' + statusCor + ';background:' + statusCor + '1a">' +
    statusIcon + ' ' + c.status_label + '</span>' +
    '<span class="dt">' + dtFormatted + '</span>' +
    '<span class="arrow">›</span>' +
    '</div>' +
    '<div class="card-body">' +
    '<div class="detail-grid">' +
    '<div class="detail-item"><div class="lbl">CDCVM</div><div class="val">' + parseInt(c.cd) + '</div></div>' +
    '<div class="detail-item"><div class="lbl">Data Cancelamento</div><div class="val">' + (c.dt || '—') + '</div></div>' +
    '<div class="detail-item"><div class="lbl">Motivo Legal</div><div class="val" style="font-size:10px">' + motivo + '</div></div>' +
    '<div class="detail-item"><div class="lbl">Setor</div><div class="val" style="font-size:10px">' + (setor||'—') + '</div></div>' +
    '</div>' +
    '<div class="filing-badge" style="color:' + statusCor + ';border-color:' + statusCor + ';background:' + statusCor + '15">' +
    statusIcon + ' ' + (c.n_filings > 0 ? c.n_filings + ' docs nos últimos 2 anos' : 'Sem filings recentes') +
    '</div>' +
    laudosHtml +
    '<div style="margin-top:10px">' +
    '<a href="/empresa/' + c.cd + '" style="padding:5px 12px;background:#1a1a2e;color:#fff;border-radius:5px;font-size:10px;text-decoration:none;margin-right:6px">📋 Ver todos os docs CVM</a>' +
    '</div>' +
    '</div>' +
    '</div>';
}

function toggleCard(cd) {
  const el = document.getElementById('card-' + cd);
  if (el) el.classList.toggle('open');
}

function toggleCat(btn) {
  const cat = btn.dataset.cat;
  if (btn.classList.contains('on')) {
    btn.classList.remove('on');
    btn.classList.add('off');
    btn.style.borderColor = '#ddd';
    btn.style.background = '#f5f5f5';
    btn.style.color = '#999';
    btn.querySelector('.dot').style.background = '#ddd';
    activeCats.delete(cat);
  } else {
    btn.classList.remove('off');
    btn.classList.add('on');
    const cor = CAT_COLORS[cat] || '#ccc';
    btn.style.borderColor = cor;
    btn.style.background = cor + '15';
    btn.style.color = cor;
    btn.querySelector('.dot').style.background = cor;
    activeCats.add(cat);
  }
  applyFilter();
}

function toggleStatus(btn) {
  const status = btn.dataset.status;
  if (btn.classList.contains('on')) {
    btn.classList.remove('on');
    btn.classList.add('off');
    btn.style.borderColor = '#ddd';
    btn.style.background = '#f5f5f5';
    btn.style.color = '#999';
    btn.querySelector('.dot').style.background = '#ddd';
    activeStatus.delete(status);
  } else {
    btn.classList.remove('off');
    btn.classList.add('on');
    const cor = STATUS_COLORS[status] || '#ccc';
    btn.style.borderColor = cor;
    btn.style.background = cor + '15';
    btn.style.color = cor;
    btn.querySelector('.dot').style.background = cor;
    activeStatus.add(status);
  }
  applyFilter();
}

let searchTimer;
function onSearch(q) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQ = q.trim();
    applyFilter();
  }, 200);
}

function changePage(dir) {
  page += dir;
  renderPage();
  window.scrollTo({top:0,behavior:'smooth'});
}

loadData();
</script>
</body></html>`;

  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','s-maxage=300,stale-while-revalidate=60');
  res.status(200).send(html);
};
