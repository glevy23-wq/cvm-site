// aqal.js — Tabela AQ/AL com filtros e paginação
// Fonte única: aq_al_processed no Supabase

const SUPA_URL = process.env.SUPABASE_URL || "https://emumlldqewikrvbdfesd.supabase.co";
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;

module.exports = async function handler(req, res) {
  const { limit: lP = "50", page: pP = "1", format, cdcvm, dias = "30", q } = req.query;
  const limit  = Math.min(parseInt(lP), 200);
  const page   = parseInt(pP);
  const offset = (page - 1) * limit;

  const H = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, Prefer: 'count=exact' };

  let url = `${SUPA_URL}/rest/v1/aq_al_processed?select=*&order=data_entrega.desc,hora_entrega.desc&limit=${limit}&offset=${offset}`;
  if (cdcvm) url += `&cdcvm=eq.${cdcvm}`;
  if (dias && !cdcvm) {
    const desde = new Date(Date.now() - parseInt(dias) * 86400000).toISOString().substring(0,10);
    url += `&data_entrega=gte.${desde}`;
  }

  const r     = await fetch(url, { headers: H });
  const data  = await r.json();
  const total = r.headers.get('content-range')?.split('/')[1] ?? '?';
  const rows  = Array.isArray(data) ? data : [];

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({ total, page, pages: Math.ceil(parseInt(total)/limit), data: rows });
    return;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  res.status(200).send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AQ/AL — CVM Monitor</title>
<meta name="description" content="Participações acionárias relevantes — CVM Resolução 44/21">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0f1117;--card:#1a1d27;--border:#2d3748;--text:#e2e8f0;--muted:#64748b;--purple:#7c3aed;--green:#22c55e;--red:#ef4444;--blue:#60a5fa}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--text)}
header{background:var(--card);border-bottom:1px solid var(--border);padding:12px 24px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:10}
header a{color:var(--purple);text-decoration:none;font-weight:700}
.container{max-width:1400px;margin:0 auto;padding:20px 16px}
.toolbar{display:flex;gap:8px;margin-bottom:14px;align-items:center;flex-wrap:wrap}
.toolbar input{flex:1;min-width:200px;padding:8px 14px;background:var(--card);border:1.5px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;outline:none}
.toolbar input:focus{border-color:var(--purple)}
.dias-btn{padding:5px 12px;background:var(--card);border:1px solid var(--border);border-radius:20px;color:var(--muted);font-size:12px;cursor:pointer;text-decoration:none;white-space:nowrap}
.dias-btn.active,.dias-btn:hover{background:var(--purple);color:#fff;border-color:var(--purple)}
.count{color:var(--muted);font-size:12px;margin-bottom:8px}
table{width:100%;border-collapse:collapse;font-size:12px}
th{background:var(--card);padding:8px 10px;text-align:left;border-bottom:2px solid var(--border);color:var(--muted);font-weight:600;white-space:nowrap;position:sticky;top:57px}
td{padding:7px 10px;border-bottom:1px solid #1a2030;vertical-align:middle}
tr:hover td{background:#151820}
.compra{color:var(--green);font-weight:700}
.venda{color:var(--red);font-weight:700}
.ticker{color:var(--purple);font-weight:700;background:#1e1040;padding:1px 6px;border-radius:4px;font-size:11px;margin-right:4px}
.link{color:var(--blue);text-decoration:none;font-size:11px}
.link:hover{text-decoration:underline}
.intent{font-size:14px}
</style>
</head>
<body>
<header>
  <a href="/">← CVM Monitor</a>
  <span style="color:var(--muted);font-size:13px">Participações Acionárias · ${total} registros</span>
</header>
<div class="container">
<div class="toolbar">
  <input type="text" id="q" placeholder="Filtrar empresa, investidor, operação..." oninput="filter(this.value)" value="${q||''}">
  <a class="dias-btn${dias==='7'?' active':''}"  href="?dias=7">7d</a>
  <a class="dias-btn${dias==='30'?' active':''}" href="?dias=30">30d</a>
  <a class="dias-btn${dias==='90'?' active':''}" href="?dias=90">90d</a>
  <a class="dias-btn" href="?dias=365">1 ano</a>
  <a class="dias-btn" href="?format=json" style="margin-left:auto">API JSON</a>
</div>
<div class="count" id="count">${rows.length} de ${total} registros</div>
<table>
<thead>
<tr>
  <th>Data</th><th>Empresa</th><th>Investidor</th><th>Op</th><th>Classe</th>
  <th>Antes → Depois</th><th>Delta</th><th>Intenção</th><th>PDF</th>
</tr>
</thead>
<tbody id="tbody">
${rows.map(r=>{
  const op = r.operacao==='COMPRA'?`<span class="compra">▲ COMPRA</span>`
            :r.operacao==='VENDA'?`<span class="venda">▼ VENDA</span>`
            :(r.operacao||'—');
  const delta = r.delta_pct!=null?(r.delta_pct>0?`+${r.delta_pct.toFixed(2)}%`:`${r.delta_pct.toFixed(2)}%`):'—';
  const dc    = r.delta_pct>0?'var(--green)':r.delta_pct<0?'var(--red)':'var(--muted)';
  const tkr   = r.ticker?`<span class="ticker">${r.ticker}</span>`:'';
  return `<tr>
    <td>${(r.data_entrega||'').substring(0,10)}</td>
    <td>${tkr}${r.empresa_nome||'—'}</td>
    <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.investidor_nome||''}">${r.investidor_nome||'—'}</td>
    <td>${op}</td>
    <td>${r.classe_acao||'—'}</td>
    <td style="font-family:monospace;white-space:nowrap">${r.pct_antes_total??r.pct_antes_on??''}% → ${r.pct_depois_total??r.pct_depois_on??''}%</td>
    <td style="font-family:monospace;color:${dc}">${delta}</td>
    <td class="intent">${r.intencao||'⚪'}</td>
    <td>${r.link_pdf?`<a class="link" href="${r.link_pdf}" target="_blank">PDF</a>`:'—'}</td>
  </tr>`;
}).join('')}
</tbody>
</table>
</div>
<script>
function filter(q){
  const rows=document.querySelectorAll('#tbody tr');
  const ql=q.toLowerCase();
  let v=0;
  rows.forEach(r=>{const s=!ql||r.textContent.toLowerCase().includes(ql);r.style.display=s?'':'none';if(s)v++;});
  document.getElementById('count').textContent=ql?v+' resultado'+(v!==1?'s':''):'${rows.length} de ${total} registros';
}
</script>
</body>
</html>`);
}
