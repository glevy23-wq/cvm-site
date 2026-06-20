// empresa.js — Página de empresa CVM
// Usa env vars (não credenciais hardcoded)
// ?ticker=PETR4 ou ?cdcvm=009512

const SUPA_URL = process.env.SUPABASE_URL || "https://emumlldqewikrvbdfesd.supabase.co";
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  if (!SUPA_KEY) { res.status(500).json({ error: 'SUPABASE_SERVICE_KEY não configurado' }); return; }

  const { cdcvm: rawCdcvm, ticker, year } = req.query;
  let cdcvm = (rawCdcvm || "").replace(/-/g, "").padStart(6, "0");
  const H = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` };

  // Resolver ticker → cdcvm
  if (!cdcvm.replace(/^0+/, "") && ticker) {
    const rt = await fetch(`${SUPA_URL}/rest/v1/empresas_b3?ticker=eq.${encodeURIComponent(ticker)}&select=cdcvm&limit=1`, { headers: H });
    const bt = await rt.json();
    if (bt?.[0]?.cdcvm) {
      cdcvm = bt[0].cdcvm.replace(/-/g, "").padStart(6, "0");
    } else {
      const prefix = (ticker || '').replace(/[0-9]/g, '');
      if (prefix.length >= 3) {
        const rt2 = await fetch(`${SUPA_URL}/rest/v1/empresas_b3?denom_social=ilike.*${encodeURIComponent(prefix)}*&select=cdcvm,ticker,denom_social&limit=1`, { headers: H });
        const bt2 = await rt2.json();
        if (bt2?.[0]?.cdcvm) cdcvm = bt2[0].cdcvm.replace(/-/g, "").padStart(6, "0");
      }
    }
  }

  if (!cdcvm.replace(/^0+/, "")) {
    res.status(400).send("Informe ?ticker=PETR4 ou ?cdcvm=NNNN");
    return;
  }

  // Queries paralelas
  let filingsUrl = `${SUPA_URL}/rest/v1/filings?cdcvm=eq.${cdcvm}&select=dtreceb,horareceb,dtrefer,categdoc,motivo,versao,linkdoc&order=dtreceb.desc,horareceb.desc`;
  if (year) {
    filingsUrl += `&dtreceb=gte.${year}-01-01&dtreceb=lte.${year}-12-31`;
  }
  filingsUrl += '&limit=500';

  const [rMeta, rFilings, rAqal] = await Promise.all([
    fetch(`${SUPA_URL}/rest/v1/companies_landing_precomputed?cd_cvm=eq.${cdcvm}&select=ticker,denom_social,setor,cnpj,payload_json&limit=1`, { headers: H }),
    fetch(filingsUrl, { headers: H }),
    fetch(`${SUPA_URL}/rest/v1/aq_al_processed?cdcvm=eq.${cdcvm}&select=data_entrega,operacao,classe_acao,investidor_nome,pct_antes_total,pct_depois_total,delta_pct,intencao,link_pdf&order=data_entrega.desc&limit=20`, { headers: H })
  ]);

  const [metaRaw, filingsRaw, aqalRaw] = await Promise.all([rMeta.json(), rFilings.json(), rAqal.json()]);

  if (!Array.isArray(metaRaw) || metaRaw.length === 0) {
    res.status(404).send(`Empresa cdcvm ${cdcvm} não encontrada`);
    return;
  }

  const meta    = metaRaw[0];
  const filings = Array.isArray(filingsRaw) ? filingsRaw : [];
  const aqals   = Array.isArray(aqalRaw) ? aqalRaw : [];
  const empresa = meta.denom_social || `CVM ${cdcvm}`;
  const tkr     = meta.ticker || "";
  const cnpj    = meta.cnpj || "";
  const setor   = meta.setor || "";

  // Calcular anos disponíveis
  const anos = [...new Set(filings.map(f => (f.dtreceb||'').substring(0,4)).filter(Boolean))].sort().reverse();

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${tkr ? tkr + ' — ' : ''}${empresa} | CVM Monitor</title>
<meta name="description" content="Documentos CVM de ${empresa}. ${filings.length} filings.">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0f1117;--card:#1a1d27;--border:#2d3748;--text:#e2e8f0;--muted:#64748b;--purple:#7c3aed;--green:#22c55e;--red:#ef4444;--blue:#60a5fa}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
header{background:var(--card);border-bottom:1px solid var(--border);padding:12px 24px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:10}
header a{color:var(--purple);text-decoration:none;font-weight:700}
.container{max-width:1200px;margin:0 auto;padding:24px 16px}
.hero{margin-bottom:24px}
.hero h1{font-size:24px;font-weight:800;display:flex;align-items:center;gap:10px}
.ticker-badge{background:var(--purple);color:#fff;padding:3px 10px;border-radius:6px;font-size:14px;font-weight:700}
.meta-line{color:var(--muted);font-size:13px;margin-top:6px}
.tabs{display:flex;gap:0;border-bottom:1px solid var(--border);margin-bottom:20px}
.tab{padding:10px 20px;cursor:pointer;font-size:14px;font-weight:600;color:var(--muted);border-bottom:2px solid transparent;transition:all .15s}
.tab.active{color:var(--purple);border-bottom-color:var(--purple)}
.tab-content{display:none}.tab-content.active{display:block}
.search-bar{display:flex;gap:8px;margin-bottom:16px}
.search-bar input{flex:1;padding:9px 14px;background:var(--card);border:1.5px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;outline:none}
.search-bar input:focus{border-color:var(--purple)}
.year-filter{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.year-btn{padding:4px 12px;background:var(--card);border:1px solid var(--border);border-radius:20px;color:var(--muted);font-size:12px;cursor:pointer;text-decoration:none}
.year-btn.active,.year-btn:hover{background:var(--purple);color:#fff;border-color:var(--purple)}
table{width:100%;border-collapse:collapse;font-size:12px}
th{background:var(--card);padding:8px 10px;text-align:left;border-bottom:2px solid var(--border);color:var(--muted);font-weight:600;white-space:nowrap;position:sticky;top:57px}
td{padding:7px 10px;border-bottom:1px solid #1a2030;vertical-align:top}
tr:hover td{background:#151820}
.link-doc{color:var(--blue);text-decoration:none;font-size:11px}
.link-doc:hover{text-decoration:underline}
.count{color:var(--muted);font-size:12px;margin-bottom:8px}
.aqal-card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:10px}
.aqal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.op-compra{color:var(--green);font-weight:700}
.op-venda{color:var(--red);font-weight:700}
.delta{font-family:monospace;font-size:13px}
.empty{text-align:center;padding:40px;color:var(--muted);font-size:14px}
</style>
</head>
<body>
<header>
  <a href="/">← CVM Monitor</a>
  <span style="color:var(--muted);font-size:13px">${empresa}</span>
</header>
<div class="container">
  <div class="hero">
    <h1>${tkr ? `<span class="ticker-badge">${tkr}</span>` : ''} ${empresa}</h1>
    <div class="meta-line">CNPJ: ${cnpj} &nbsp;|&nbsp; Setor: ${setor || '—'} &nbsp;|&nbsp; cdcvm: ${cdcvm} &nbsp;|&nbsp; ${filings.length} documentos</div>
  </div>

  <div class="tabs">
    <div class="tab active" onclick="showTab('filings',this)">📋 Todos os Documentos (${filings.length})</div>
    <div class="tab" onclick="showTab('aqal',this)">🔄 AQ/AL (${aqals.length})</div>
  </div>

  <!-- TAB FILINGS -->
  <div id="tab-filings" class="tab-content active">
    <div class="search-bar">
      <input type="text" id="q-filings" placeholder="Filtrar por categoria, motivo, data..." oninput="filterFilings(this.value)">
    </div>
    <div class="year-filter">
      <a class="year-btn active" href="?${ticker?`ticker=${ticker}`:`cdcvm=${rawCdcvm}`}">Todos</a>
      ${anos.slice(0,8).map(a=>`<a class="year-btn${year===a?' active':''}" href="?${ticker?`ticker=${ticker}`:`cdcvm=${rawCdcvm}`}&year=${a}">${a}</a>`).join('')}
    </div>
    <div class="count" id="count-filings">${filings.length} documentos</div>
    <table>
    <thead>
      <tr><th>Data Entrega</th><th>Hora</th><th>Data Ref.</th><th>Categoria</th><th>Descrição</th><th>V.</th><th></th></tr>
    </thead>
    <tbody id="tbody-filings">
    ${filings.map(f=>`<tr>
      <td>${(f.dtreceb||'').substring(0,10)}</td>
      <td style="color:var(--muted)">${(f.horareceb||'').substring(0,5)}</td>
      <td style="color:var(--muted)">${(f.dtrefer||'').substring(0,10)}</td>
      <td><strong>${f.categdoc||'—'}</strong></td>
      <td style="color:var(--muted);max-width:300px">${(f.motivo||'').substring(0,90)}</td>
      <td style="color:var(--muted)">${f.versao||''}</td>
      <td>${f.linkdoc?`<a class="link-doc" href="${f.linkdoc}" target="_blank">🔗 Ver</a>`:'—'}</td>
    </tr>`).join('')}
    </tbody>
    </table>
  </div>

  <!-- TAB AQAL -->
  <div id="tab-aqal" class="tab-content">
    ${aqals.length === 0 ? '<div class="empty">Nenhum AQ/AL registrado para esta empresa.</div>' :
      aqals.map(a=>{
        const op = a.operacao;
        const opClass = op==='COMPRA'?'op-compra':'op-venda';
        const opIcon  = op==='COMPRA'?'▲':'▼';
        const delta   = a.delta_pct!=null ? (a.delta_pct>0?`+${a.delta_pct.toFixed(2)}%`:`${a.delta_pct.toFixed(2)}%`) : '—';
        const deltaColor = a.delta_pct>0?'var(--green)':a.delta_pct<0?'var(--red)':'var(--muted)';
        return `<div class="aqal-card">
          <div class="aqal-header">
            <span class="${opClass}">${opIcon} ${op||'?'} — ${a.classe_acao||'?'}</span>
            <span style="color:var(--muted);font-size:12px">${(a.data_entrega||'').substring(0,10)}</span>
          </div>
          <div style="font-size:13px;margin-bottom:4px"><strong>${a.investidor_nome||'Investidor não identificado'}</strong></div>
          <div class="delta" style="color:${deltaColor}">${a.pct_antes_total??'?'}% → ${a.pct_depois_total??'?'}% &nbsp; (${delta})</div>
          <div style="margin-top:6px;font-size:11px;color:var(--muted)">Intenção: ${a.intencao||'⚪'} &nbsp;${a.link_pdf?`<a class="link-doc" href="${a.link_pdf}" target="_blank">PDF CVM</a>`:''}</div>
        </div>`;
      }).join('')
    }
  </div>
</div>

<script>
function showTab(id, el) {
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('tab-'+id).classList.add('active');
  el.classList.add('active');
}
function filterFilings(q) {
  const rows = document.querySelectorAll('#tbody-filings tr');
  const ql = q.toLowerCase();
  let vis = 0;
  rows.forEach(r=>{ const show=!ql||r.textContent.toLowerCase().includes(ql); r.style.display=show?'':'none'; if(show)vis++; });
  document.getElementById('count-filings').textContent = ql ? vis+' resultado'+(vis!==1?'s':'') : '${filings.length} documentos';
}
</script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
  res.status(200).send(html);
}
