// fatos-relevantes.js — Fatos Relevantes de todas as empresas
// Melhor dos 3: Fundamentus (descrição) + Sabbius (search+cols+export) + InvestSite (histórico)
// Fonte: Supabase filings WHERE categdoc = 'Fato Relevante'

const SUPA = process.env.SUPABASE_URL || 'https://emumlldqewikrvbdfesd.supabase.co';
const KEY  = () => process.env.SUPABASE_SERVICE_KEY;
const PAGE_SIZE = 50; // 50 por página (como Fundamentus)
const TOTAL_APPROX = 51398;

module.exports = async function handler(req, res) {
  if (!KEY()) { res.status(500).send('Config error'); return; }

  const page    = Math.max(0, parseInt(req.query.page  || '0'));
  const q       = (req.query.q    || '').slice(0, 120).trim();
  const empresa = (req.query.emp  || '').slice(0, 100).trim();
  const ano     = (req.query.ano  || '').slice(0, 4);
  const cols    = (req.query.cols || 'data,empresa,ticker,descricao,assunto,link').split(',');
  const format  = req.query.format || 'html';
  const offset  = page * PAGE_SIZE;

  // Construir query Supabase
  let qs = `select=dtreceb,dtrefer,empresa,ticker,cdcvm,especiedoc,assunto,importancia,badge_gov,linkdoc,motivo&categdoc=eq.Fato+Relevante&order=dtreceb.desc&limit=${PAGE_SIZE}&offset=${offset}`;
  if (empresa) qs += `&empresa=ilike.%25${encodeURIComponent(empresa)}%25`;
  if (ano)     qs += `&dtreceb=gte.${ano}-01-01&dtreceb=lte.${ano}-12-31`;
  if (q)       qs += `&or=(empresa.ilike.%25${encodeURIComponent(q)}%25,especiedoc.ilike.%25${encodeURIComponent(q)}%25)`;

  let docs = [], total = TOTAL_APPROX;
  try {
    const resp = await fetch(`${SUPA}/rest/v1/filings?${qs}`, {
      headers: { apikey: KEY(), Authorization: `Bearer ${KEY()}` }
    });
    docs = await resp.json();
    // Sem count=exact — usa TOTAL_APPROX fixo para performance
    if (!Array.isArray(docs)) { res.status(500).send('Query error: ' + JSON.stringify(docs).slice(0,100)); return; }
  } catch(e) { res.status(500).send('Fetch error: ' + e.message); return; }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ── FORMAT: CSV/EXCEL ──────────────────────────────────
  if (format === 'csv') {
    const headers_csv = ['Data Entrega','Data Referência','Empresa','Ticker','CDCVM','Assunto/Espécie','Importância','Badge','Link'];
    const rows = docs.map(d => [
      d.dtreceb?.slice(0,10) || '',
      d.dtrefer?.slice(0,10) || '',
      '"'+(d.empresa||'').replace(/"/g,"''")+'"',
      d.ticker && d.ticker !== 'Private' ? d.ticker : '',
      parseInt(d.cdcvm||'0'),
      '"'+(d.especiedoc||d.assunto||'').replace(/ -$/,'').replace(/"/g,"''")+'"',
      d.importancia || '',
      d.badge_gov || '',
      d.linkdoc || '',
    ]);
    const csv = [headers_csv.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type','text/csv; charset=utf-8');
    res.setHeader('Content-Disposition','attachment; filename="fatos-relevantes.csv"');
    res.status(200).send('\uFEFF' + csv); // BOM para Excel PT
    return;
  }

  // ── BADGE HELPER ──────────────────────────────────────
  const badge = (b, imp) => {
    if (b === 'SCARY')    return '<span class="b scary">🚨 Crítico</span>';
    if (b === 'MATERIAL') return '<span class="b mat">🔴 Material</span>';
    if (b === 'WARN')     return '<span class="b warn">🟡 Atenção</span>';
    if (imp >= 9)         return '<span class="b mat">🔴 Material</span>';
    if (imp >= 7)         return '<span class="b warn">🟡 Relevante</span>';
    return '';
  };

  const buildLink = (p) => {
    let l = `/fatos-relevantes?page=${p}`;
    if (q)       l += `&q=${encodeURIComponent(q)}`;
    if (empresa) l += `&emp=${encodeURIComponent(empresa)}`;
    if (ano)     l += `&ano=${ano}`;
    if (cols.join(',') !== 'data,empresa,ticker,descricao,assunto,link') l += `&cols=${cols.join(',')}`;
    return l;
  };

  // ── ANOS disponíveis ─────────────────────────────────
  const anos = [];
  for (let y = 2026; y >= 2003; y--) anos.push(y);

  // ── HTML ─────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fatos Relevantes — ${total.toLocaleString('pt-BR')} docs · CVM Monitor</title>
<meta name="description" content="Todos os Fatos Relevantes CVM desde 2003. ${total.toLocaleString('pt-BR')} documentos, busca instantânea, export Excel.">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f6f8;color:#1a1a2e;font-size:13px}
/* Header */
.hdr{background:#1a1a2e;color:#fff;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}
.hdr-left{display:flex;align-items:center;gap:10px}
.hdr-left a{color:#fff;font-size:18px;text-decoration:none;line-height:1}
.hdr-title{font-size:15px;font-weight:800;letter-spacing:-.3px}
.hdr-sub{font-size:9px;color:#9ab;margin-top:3px;letter-spacing:.3px;text-transform:uppercase}
.hdr-nav{display:flex;gap:6px;flex-wrap:wrap}
.hdr-nav a{color:#aac;font-size:10px;text-decoration:none;padding:4px 9px;border:1px solid rgba(255,255,255,.15);border-radius:5px;white-space:nowrap;transition:all .15s}
.hdr-nav a:hover,.hdr-nav a.on{background:rgba(255,255,255,.12);color:#fff}
/* Toolbar */
.wrap{max-width:1400px;margin:0 auto;padding:10px}
.toolbar{background:#fff;border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,.07);padding:10px 14px;margin-bottom:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.toolbar input[name=q]{flex:2;min-width:180px;padding:8px 12px;border:1.5px solid #e0e4ed;border-radius:7px;font-size:13px;outline:none;transition:border .15s}
.toolbar input[name=q]:focus{border-color:#1a1a2e}
.toolbar input[name=emp]{flex:1;min-width:130px;padding:8px 10px;border:1.5px solid #e0e4ed;border-radius:7px;font-size:12px;outline:none}
.toolbar input[name=emp]:focus{border-color:#1a1a2e}
.toolbar select{padding:8px 10px;border:1.5px solid #e0e4ed;border-radius:7px;font-size:12px;background:#fff;outline:none;cursor:pointer}
.toolbar button{padding:8px 16px;background:#1a1a2e;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap}
.toolbar button:hover{background:#2d2d4e}
.btn-exp{padding:8px 12px;border:1.5px solid #27ae60;color:#27ae60;background:#fff;border-radius:7px;cursor:pointer;font-size:11px;font-weight:600;text-decoration:none;white-space:nowrap}
.btn-exp:hover{background:#27ae60;color:#fff}
.btn-clr{padding:8px 10px;border:1.5px solid #ddd;color:#888;background:#fff;border-radius:7px;cursor:pointer;font-size:11px;text-decoration:none}
/* Stats bar */
.stats-bar{display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap}
.stat-pill{background:#fff;border-radius:8px;padding:9px 14px;box-shadow:0 1px 3px rgba(0,0,0,.05);display:flex;flex-direction:column;align-items:center;min-width:72px}
.stat-pill .n{font-size:17px;font-weight:800;color:#1a1a2e}
.stat-pill .l{font-size:8px;color:#9ab;text-transform:uppercase;letter-spacing:.4px;margin-top:2px}
/* Cols toggle */
.cols-bar{background:#fff;border-radius:8px;padding:8px 14px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,.05);display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.cols-bar span{font-size:9px;color:#888;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-right:4px}
.col-toggle{padding:3px 9px;border-radius:12px;font-size:10px;cursor:pointer;border:1.5px solid #dde;background:#f7f8fb;color:#556;transition:all .15s;text-decoration:none;display:inline-block}
.col-toggle.on{background:#1a1a2e;color:#fff;border-color:#1a1a2e}
/* Table card */
.table-card{background:#fff;border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,.07);overflow:hidden}
.table-head{padding:10px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f0f2f7}
.table-head h2{font-size:12px;font-weight:700}
.table-head small{font-size:9px;color:#aaa}
.tbl-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse}
th{padding:8px 12px;font-size:9px;color:#778;font-weight:700;text-transform:uppercase;letter-spacing:.4px;background:#fafbfd;border-bottom:1.5px solid #eef0f7;white-space:nowrap;cursor:pointer;user-select:none}
th:hover{background:#f0f4ff;color:#1a1a2e}
th .sort-arrow{margin-left:3px;opacity:.4;font-size:8px}
th.active-sort .sort-arrow{opacity:1;color:#1a1a2e}
td{padding:8px 12px;font-size:11px;border-bottom:1px solid #f5f7fb;vertical-align:middle;overflow:hidden;text-overflow:ellipsis}
tr:hover td{background:#fafcff}
.dt{white-space:nowrap;color:#778;font-size:10px;font-variant-numeric:tabular-nums}
.company-link{color:#1a1a2e;text-decoration:none;font-weight:600;font-size:11px}
.company-link:hover{text-decoration:underline}
.tk{display:inline-block;background:#1a1a2e;color:#fff;padding:1px 5px;border-radius:3px;font-size:9px;font-weight:700;margin-left:4px}
.tk.priv{background:#e8eaf0;color:#888}
.descricao{max-width:380px;color:#334;line-height:1.4}
.descricao .esp{font-weight:600;color:#1a1a2e}
.descricao .ass{color:#778;font-size:10px;margin-top:2px}
td.link-td{text-align:center}
a.doc-link{color:#1a73e8;text-decoration:none;font-size:14px}
a.doc-link:hover{opacity:.7}
/* Badges */
.b{font-size:9px;font-weight:700;padding:2px 6px;border-radius:3px;white-space:nowrap}
.b.scary{background:#fee;color:#c0392b}
.b.mat{background:#fff0f0;color:#e74c3c}
.b.warn{background:#fffbf0;color:#f39c12}
/* Pager */
.pager{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-top:1px solid #f0f2f7;flex-wrap:wrap;gap:6px;background:#fafbfd}
.pager a{padding:5px 13px;border:1.5px solid #dde;border-radius:6px;font-size:11px;text-decoration:none;color:#1a1a2e;background:#fff;font-weight:500;white-space:nowrap}
.pager a:hover{background:#1a1a2e;color:#fff;border-color:#1a1a2e}
.pager a.dis{opacity:.35;pointer-events:none}
.pager .pg-info{font-size:11px;color:#778}
/* Pager numbers */
.pg-nums{display:flex;gap:3px}
.pg-nums a{min-width:28px;text-align:center;padding:4px 8px}
.pg-nums a.cur{background:#1a1a2e;color:#fff;border-color:#1a1a2e;cursor:default}
/* Footer */
footer{text-align:center;padding:14px;color:#aaa;font-size:9px;border-top:1px solid #eee;margin-top:12px;letter-spacing:.3px}
footer a{color:#aaa}
</style>
</head>
<body>
<div class="hdr">
  <div class="hdr-left">
    <a href="/">←</a>
    <div>
      <div class="hdr-title">📋 Fatos Relevantes</div>
      <div class="hdr-sub">${total.toLocaleString('pt-BR')} documentos · CVM · 2003–2026</div>
    </div>
  </div>
  <nav class="hdr-nav">
    <a href="/">🏠 Início</a>
    <a href="/global">📋 Todos os Docs</a>
    <a href="/aqal">📊 AQ/AL</a>
    <a href="/fechamento">🏛 Fechamentos</a>
  </nav>
</div>

<div class="wrap">

  <!-- TOOLBAR -->
  <form class="toolbar" method="GET" action="/fatos-relevantes">
    <input name="q" value="${q.replace(/"/g,'&quot;')}"
      placeholder="🔍 Buscar em assunto, empresa, descrição..."
      autocomplete="off" id="search-input">
    <input name="emp" value="${empresa.replace(/"/g,'&quot;')}"
      placeholder="Empresa específica..." autocomplete="off">
    <select name="ano" onchange="this.form.submit()">
      <option value="">Todos os anos</option>
      ${anos.map(y => `<option value="${y}"${ano==String(y)?' selected':''}>${y}</option>`).join('')}
    </select>
    <button type="submit">Buscar</button>
    ${(q||empresa||ano) ? `<a class="btn-clr" href="/fatos-relevantes">✕ Limpar</a>` : ''}
    <a class="btn-exp" href="/fatos-relevantes?format=csv${q?'&q='+encodeURIComponent(q):''}${empresa?'&emp='+encodeURIComponent(empresa):''}${ano?'&ano='+ano:''}">⬇ CSV/Excel</a>
  </form>

  <!-- STATS -->
  <div class="stats-bar">
    <div class="stat-pill"><div class="n">${total.toLocaleString('pt-BR')}</div><div class="l">Fatos Relevantes</div></div>
    <div class="stat-pill"><div class="n">23</div><div class="l">Anos (2003+)</div></div>
    <div class="stat-pill"><div class="n">${PAGE_SIZE}</div><div class="l">Por Página</div></div>
    <div class="stat-pill"><div class="n">${totalPages.toLocaleString('pt-BR')}</div><div class="l">Páginas</div></div>
    ${(q||empresa||ano) ? `<div class="stat-pill"><div class="n">${total.toLocaleString('pt-BR')}</div><div class="l">Filtrados</div></div>` : ''}
  </div>

  <!-- COLUNAS TOGGLE (estilo Sabbius) -->
  <div class="cols-bar">
    <span>Colunas:</span>
    ${[
      {key:'data',     label:'Data'},
      {key:'empresa',  label:'Empresa'},
      {key:'ticker',   label:'Ticker'},
      {key:'descricao',label:'Descrição'},
      {key:'assunto',  label:'Assunto'},
      {key:'badge',    label:'Badge'},
      {key:'ref',      label:'Dt. Referência'},
      {key:'link',     label:'PDF'},
    ].map(({key, label}) => {
      const isOn = cols.includes(key);
      const newCols = isOn
        ? cols.filter(c=>c!==key).join(',')
        : [...cols, key].join(',');
      return `<a class="col-toggle${isOn?' on':''}" href="/fatos-relevantes?page=${page}${q?'&q='+encodeURIComponent(q):''}${empresa?'&emp='+encodeURIComponent(empresa):''}${ano?'&ano='+ano:''}&cols=${newCols}">${label}</a>`;
    }).join('')}
    <a class="col-toggle" href="/fatos-relevantes?page=${page}${q?'&q='+encodeURIComponent(q):''}${empresa?'&emp='+encodeURIComponent(empresa):''}${ano?'&ano='+ano:''}"
       style="border-color:#ccc;color:#999;font-size:9px">↺ Reset</a>
  </div>

  <!-- TABELA -->
  <div class="table-card">
    <div class="table-head">
      <h2>📋 ${docs.length} docs nesta página</h2>
      <small>Pág. ${page+1} de ${totalPages.toLocaleString('pt-BR')} · ${offset+1}–${Math.min(offset+PAGE_SIZE,total)} de ${total.toLocaleString('pt-BR')}</small>
    </div>
    <div class="tbl-wrap">
    <table id="fr-table">
      <thead><tr>
        ${cols.includes('data')     ? '<th>Data <span class="sort-arrow">↕</span></th>' : ''}
        ${cols.includes('empresa')  ? '<th>Empresa</th>' : ''}
        ${cols.includes('ticker')   ? '<th>Ticker</th>' : ''}
        ${cols.includes('descricao')? '<th>Descrição / Espécie</th>' : ''}
        ${cols.includes('assunto')  ? '<th>Assunto CVM</th>' : ''}
        ${cols.includes('badge')    ? '<th>Badge</th>' : ''}
        ${cols.includes('ref')      ? '<th>Data Ref.</th>' : ''}
        ${cols.includes('link')     ? '<th>PDF</th>' : ''}
      </tr></thead>
      <tbody>
        ${docs.map(d => {
          const dt   = (d.dtreceb||'').slice(0,10);
          const dtR  = (d.dtrefer||'').slice(0,10);
          const nome = (d.empresa||'—').slice(0,45);
          const tk   = d.ticker && d.ticker !== 'Private' ? d.ticker : '';
          const cd   = d.cdcvm||'';
          const esp  = (d.especiedoc||'').replace(/ -$/,'').slice(0,80);
          const ass  = (d.assunto||'').slice(0,60);
          const imp  = d.importancia;
          const bg   = d.badge_gov;
          const lnk  = d.linkdoc||'';
          const href = tk ? '/empresa/'+tk : '/empresa?cdcvm='+parseInt(cd);
          return '<tr>'+
            (cols.includes('data')     ? `<td class="dt">${dt}</td>` : '')+
            (cols.includes('empresa')  ? `<td><a class="company-link" href="${href}">${nome.replace(/</g,'&lt;')}</a></td>` : '')+
            (cols.includes('ticker')   ? `<td>${tk ? `<span class="tk">${tk}</span>` : `<span class="tk priv">—</span>`}</td>` : '')+
            (cols.includes('descricao')? `<td class="descricao"><span class="esp">${esp.replace(/</g,'&lt;')}</span></td>` : '')+
            (cols.includes('assunto')  ? `<td style="color:#778;font-size:10px;max-width:200px">${ass.replace(/</g,'&lt;')}</td>` : '')+
            (cols.includes('badge')    ? `<td>${badge(bg, imp)}</td>` : '')+
            (cols.includes('ref')      ? `<td class="dt">${dtR}</td>` : '')+
            (cols.includes('link')     ? `<td class="link-td">${lnk ? `<a class="doc-link" href="${lnk}" target="_blank" title="Abrir PDF">📄</a>` : '—'}</td>` : '')+
            '</tr>';
        }).join('')}
      </tbody>
    </table>
    </div>

    <!-- PAGER -->
    <div class="pager">
      <a class="${page===0?'dis':''}" href="${buildLink(0)}">⟨⟨ Primeira</a>
      <a class="${page===0?'dis':''}" href="${buildLink(page-1)}">← Anterior</a>
      <div class="pg-info">
        <div class="pg-nums">
          ${(() => {
            const range = [];
            let start = Math.max(0, page - 4);
            let end   = Math.min(totalPages - 1, start + 9);
            if (end - start < 9) start = Math.max(0, end - 9);
            for (let i = start; i <= end; i++) range.push(i);
            return range.map(i =>
              `<a class="${i===page?'cur':''}" href="${buildLink(i)}">${i+1}</a>`
            ).join('');
          })()}
        </div>
      </div>
      <a class="${page>=totalPages-1?'dis':''}" href="${buildLink(page+1)}">Próxima →</a>
      <a class="${page>=totalPages-1?'dis':''}" href="${buildLink(totalPages-1)}">Última ⟩⟩</a>
    </div>
  </div>

</div><!-- /wrap -->

<footer>
  cvm-monitor.vercel.app · Fatos Relevantes CVM · 2003–2026 · Zero IA · <a href="/">← Início</a>
</footer>

<script>
// Busca instantânea client-side (complementa server-side)
const inp = document.getElementById('search-input');
const tbody = document.querySelector('#fr-table tbody');
let originalRows = null;

if (inp && tbody) {
  inp.addEventListener('input', function() {
    const val = this.value.toLowerCase().trim();
    if (!originalRows) originalRows = [...tbody.querySelectorAll('tr')];
    if (!val) {
      originalRows.forEach(r => r.style.display = '');
      return;
    }
    originalRows.forEach(r => {
      const text = r.textContent.toLowerCase();
      r.style.display = text.includes(val) ? '' : 'none';
    });
  });
}

// Sort por coluna
document.querySelectorAll('th').forEach((th, idx) => {
  let asc = false;
  th.addEventListener('click', () => {
    if (!tbody) return;
    const rows = [...tbody.querySelectorAll('tr')];
    asc = !asc;
    rows.sort((a, b) => {
      const av = a.cells[idx]?.textContent?.trim() || '';
      const bv = b.cells[idx]?.textContent?.trim() || '';
      return asc ? av.localeCompare(bv, 'pt', {numeric:true}) : bv.localeCompare(av, 'pt', {numeric:true});
    });
    rows.forEach(r => tbody.appendChild(r));
    document.querySelectorAll('th').forEach(t => t.classList.remove('active-sort'));
    th.classList.add('active-sort');
  });
});
</script>
</body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=120,stale-while-revalidate=60');
  res.status(200).send(html);
};
