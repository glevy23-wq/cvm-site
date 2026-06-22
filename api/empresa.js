// empresa.js — Land page CVM por empresa
// Lê directo da tabela filings — sem cache pré-computado

const SUPA = process.env.SUPABASE_URL || 'https://emumlldqewikrvbdfesd.supabase.co';
const KEY  = () => process.env.SUPABASE_SERVICE_KEY;

async function sfetch(path) {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: { apikey: KEY(), Authorization: `Bearer ${KEY()}` }
  });
  return r.json();
}

// Normaliza cdcvm para formato sem hífen, 6 dígitos
function normCdcvm(s) {
  return s.replace(/-/g,'').replace(/^0+/,'').padStart(6,'0');
}

export default async function handler(req, res) {
  if (!KEY()) { res.status(500).send('Config error'); return; }

  // Resolver ticker do path (/empresa/PETR4) ou query (?ticker=PETR4)
  const pathVal = (req.query.PATH || req.query.path || '').split('/')[0];
  const rawTicker = (req.query.ticker || req.query.t || pathVal || '').toUpperCase().trim();
  const rawCdcvm  = (req.query.cdcvm  || req.query.cd || '');

  let cdcvm, ticker, nome, cnpj;

  if (rawCdcvm) {
    cdcvm = normCdcvm(rawCdcvm);
  } else if (rawTicker) {
    const emp = await sfetch(`empresas_b3?ticker=eq.${rawTicker}&select=cdcvm,ticker,denom_social,cnpj&limit=1`);
    if (!emp || !emp[0]) {
      res.status(404).send(errPage(`Empresa não encontrada: ${rawTicker}`, 'Tente: PETR4, VALE3, ITUB4, BBAS3, WEGE3'));
      return;
    }
    cdcvm  = normCdcvm(emp[0].cdcvm);
    ticker = emp[0].ticker;
    nome   = emp[0].denom_social;
    cnpj   = emp[0].cnpj;
  } else {
    res.status(400).send(errPage('Ticker não informado', 'Exemplo: /empresa/PETR4'));
    return;
  }

  // Buscar info da empresa (se não veio do ticker lookup)
  if (!nome) {
    const empInfo = await sfetch(`empresas_b3?cdcvm=eq.${cdcvm}&select=ticker,denom_social,cnpj&limit=1`);
    if (empInfo && empInfo[0]) {
      ticker = ticker || empInfo[0].ticker;
      nome   = empInfo[0].denom_social;
      cnpj   = empInfo[0].cnpj;
    }
  }

  // Buscar TODOS os filings desta empresa (paginado, até 5000)
  // Supabase limita a 1000 por request, vamos buscar em paralelo
  const [f1, f2, f3, f4, f5] = await Promise.all([
    sfetch(`filings?cdcvm=eq.${cdcvm}&select=dtreceb,dtrefer,categdoc,assunto,tipodoc,especiedoc,linkdoc,importancia,dias_atraso,horareceb&order=dtreceb.desc,horareceb.desc&limit=1000&offset=0`),
    sfetch(`filings?cdcvm=eq.${cdcvm}&select=dtreceb,dtrefer,categdoc,assunto,tipodoc,especiedoc,linkdoc,importancia,dias_atraso,horareceb&order=dtreceb.desc,horareceb.desc&limit=1000&offset=1000`),
    sfetch(`filings?cdcvm=eq.${cdcvm}&select=dtreceb,dtrefer,categdoc,assunto,tipodoc,especiedoc,linkdoc,importancia,dias_atraso,horareceb&order=dtreceb.desc,horareceb.desc&limit=1000&offset=2000`),
    sfetch(`filings?cdcvm=eq.${cdcvm}&select=dtreceb,dtrefer,categdoc,assunto,tipodoc,especiedoc,linkdoc,importancia,dias_atraso,horareceb&order=dtreceb.desc,horareceb.desc&limit=1000&offset=3000`),
    sfetch(`filings?cdcvm=eq.${cdcvm}&select=dtreceb,dtrefer,categdoc,assunto,tipodoc,especiedoc,linkdoc,importancia,dias_atraso,horareceb&order=dtreceb.desc,horareceb.desc&limit=1000&offset=4000`),
  ]);

  // Deduplicar por linkdoc (remove backfill duplicates)
  const seen = new Set();
  const filings = [];
  for (const f of [...(f1||[]), ...(f2||[]), ...(f3||[]), ...(f4||[]), ...(f5||[])]) {
    const key = f.linkdoc || (f.dtreceb + f.categdoc + f.assunto);
    if (!seen.has(key)) { seen.add(key); filings.push(f); }
  }

  const totalDocs = filings.length;
  const anos = [...new Set(filings.map(f => (f.dtreceb||'').slice(0,4)).filter(Boolean))].sort((a,b) => b-a);

  // Distribuição por categoria
  const cats = {};
  for (const f of filings) {
    const c = f.categdoc || f.tipodoc || 'Outros';
    cats[c] = (cats[c]||0) + 1;
  }
  const topCats = Object.entries(cats).sort((a,b) => b[1]-a[1]).slice(0,8);

  // Gerar linhas da tabela
  const rows = filings.map(f => {
    const dt   = (f.dtreceb||'').slice(0,10);
    const dtr  = (f.dtrefer||'').slice(0,10);
    const cat  = f.categdoc || f.tipodoc || '-';
    const ass  = (f.assunto || f.especiedoc || '').slice(0,90);
    const imp  = f.importancia || '';
    const lnk  = f.linkdoc || '';
    const atr  = f.dias_atraso != null ? `<span style="color:#888;font-size:10px">${f.dias_atraso}d</span>` : '';
    const badge = imp === 'alto' ? '<span style="color:#e74c3c;font-size:10px">●</span>' 
                : imp === 'super' ? '<span style="color:#c0392b;font-size:10px">🔴</span>' : '';
    const s = (cat + ' ' + ass + ' ' + dt).toLowerCase().replace(/"/g,'').replace(/'/g,'');
    return `<tr data-s="${s}"><td>${dt}</td><td>${dtr||''}</td><td class="tc">${badge}${cat.slice(0,48)}</td><td class="ta">${ass}</td><td>${atr}</td><td>${lnk ? `<a class="lnk" href="${lnk}" target="_blank">📄</a>` : ''}</td></tr>`;
  }).join('');

  const chips = [
    ['Todos', ''],
    ['Fato Relevante', 'fato relevante'],
    ['AQ/AL', 'valores mobili'],
    ['FRE', 'formulário de referência'],
    ['DFP/ITR', 'dados econômico'],
    ['Assembleia', 'assembleia'],
    ['Comunicado', 'comunicado'],
  ].map(([l,f]) => `<span class="chip" onclick="filt('${f}')">${l}${cats[l] ? ` (${cats[l]})`:''}</span>`).join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${ticker || cdcvm} — CVM Monitor</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f6fa;color:#1a1a2e}
.hdr{background:#1a1a2e;color:#fff;padding:14px 20px;display:flex;align-items:center;gap:14px}
.tk{background:#e74c3c;padding:5px 14px;border-radius:6px;font-size:20px;font-weight:800;white-space:nowrap}
.hi h1{font-size:15px;font-weight:600}.hi small{color:#aaa;font-size:10px}
.bk{color:#aaa;font-size:20px;text-decoration:none;margin-right:4px}
.nav{background:#fff;border-bottom:2px solid #eee;padding:0 18px;display:flex;overflow-x:auto;gap:0}
.nav a{display:block;padding:10px 14px;color:#666;font-size:11px;font-weight:600;white-space:nowrap;border-bottom:3px solid transparent;cursor:pointer;text-decoration:none}
.nav a.on{color:#e74c3c;border-bottom-color:#e74c3c}
.wrap{max-width:1200px;margin:0 auto;padding:16px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin-bottom:16px}
.stat{background:#fff;border-radius:8px;padding:12px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.08)}
.stat .n{font-size:22px;font-weight:700}.stat .l{font-size:9px;color:#888;margin-top:2px}
.card{background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.08);overflow:hidden;margin-bottom:16px}
.ch{padding:11px 16px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between}
.ch h2{font-size:12px;font-weight:700}
.sw{padding:8px 16px;border-bottom:1px solid #f0f0f0}
.sw input{width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:12px;outline:none}
.sw input:focus{border-color:#e74c3c}
.chips{padding:8px 16px;border-bottom:1px solid #f0f0f0;display:flex;flex-wrap:wrap;gap:5px}
.chip{padding:3px 9px;background:#f0f4ff;border-radius:14px;font-size:10px;cursor:pointer;border:1px solid #dde}
.chip:hover,.chip.on{background:#1a1a2e;color:#fff;border-color:#1a1a2e}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:8px 12px;font-size:9px;color:#888;font-weight:700;text-transform:uppercase;letter-spacing:.5px;background:#fafafa;border-bottom:1px solid #eee}
td{padding:7px 12px;font-size:11px;border-bottom:1px solid #f8f8f8;vertical-align:middle}
.tc{max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ta{max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#555}
tr:hover td{background:#fafafa}
.lnk{color:#1a73e8;text-decoration:none}
.more{text-align:center;padding:10px;color:#888;font-size:10px;background:#fafafa}
footer{text-align:center;padding:20px;color:#aaa;font-size:10px}
</style>
</head>
<body>
<div class="hdr">
  <a class="bk" href="/">←</a>
  ${ticker ? `<div class="tk">${ticker}</div>` : ''}
  <div class="hi">
    <h1>${nome || cdcvm}</h1>
    <small>CDCVM ${parseInt(cdcvm)} ${cnpj ? '· CNPJ ' + cnpj : ''} · ${totalDocs.toLocaleString('pt-BR')} docs · 2003–2026</small>
  </div>
</div>
<nav class="nav">
  <a class="on" onclick="filtTab('')">📋 Todos (${totalDocs.toLocaleString('pt-BR')})</a>
  <a onclick="filtTab('fato relevante')">🔴 Fato Relevante (${cats['Fato Relevante']||0})</a>
  <a onclick="filtTab('valores mobili')">📊 AQ/AL (${(cats['Valores Mobiliários negociados e detidos (art. 11 da Instr. CVM nº 358)']||0) + (cats['Valores Mobiliários Negociados e Detidos — Posição Consolidada']||0)})</a>
  <a onclick="filtTab('fre')">📄 FRE (${cats['FRE']||0})</a>
  <a onclick="filtTab('dados econôm')">💰 DFP/ITR (${cats['Dados Econômico-Financeiros']||0})</a>
  <a onclick="filtTab('assembleia')">🏛 Assembleias (${cats['Assembleia']||0})</a>
  <a onclick="filtTab('comunicado')">📢 Comunicados (${cats['Comunicado ao Mercado']||0})</a>
</nav>
<div class="wrap">
  <div class="stats">
    <div class="stat"><div class="n">${totalDocs.toLocaleString('pt-BR')}</div><div class="l">Docs CVM</div></div>
    <div class="stat"><div class="n">${anos.length}</div><div class="l">Anos</div></div>
    <div class="stat"><div class="n">${anos[anos.length-1]||'?'}</div><div class="l">Desde</div></div>
    <div class="stat"><div class="n">${cats['Fato Relevante']||0}</div><div class="l">Fatos Relevantes</div></div>
    <div class="stat"><div class="n">${cats['FRE']||0}</div><div class="l">FREs</div></div>
    <div class="stat"><div class="n">${cats['Assembleia']||0}</div><div class="l">Assembleias</div></div>
  </div>
  <div class="card">
    <div class="ch"><h2>📋 Documentos CVM — ${ticker || cdcvm}</h2><span style="font-size:9px;color:#aaa">ENET · 15min</span></div>
    <div class="sw"><input type="text" id="srch" placeholder="🔍 Buscar em ${totalDocs.toLocaleString('pt-BR')} documentos..." oninput="buscar(this.value)"></div>
    <div class="chips">${chips}</div>
    <div style="overflow-x:auto">
    <table>
      <thead><tr><th>Entrega</th><th>Referência</th><th>Categoria</th><th>Assunto</th><th>Atr.</th><th>PDF</th></tr></thead>
      <tbody id="tb">${rows}</tbody>
    </table>
    </div>
    ${totalDocs > 5000 ? `<div class="more">Mostrando 5.000 de ${totalDocs.toLocaleString('pt-BR')} — use filtros para refinar</div>` : ''}
  </div>
</div>
<footer>cvm-monitor.vercel.app · CVM ENET · Zero IA · <a href="/">← Todas empresas</a></footer>
<script>
const rs=[...document.querySelectorAll('#tb tr')];
let ac='';
function buscar(q){const t=q.toLowerCase();rs.forEach(r=>{r.style.display=(r.dataset.s.includes(t)&&(!ac||r.dataset.s.includes(ac)))?'':'none'})}
function filtTab(cat){
  ac=cat;
  document.getElementById('srch').value='';
  rs.forEach(r=>{r.style.display=(!ac||r.dataset.s.includes(ac))?'':'none'});
  document.querySelectorAll('.nav a').forEach(a=>a.classList.remove('on'));
  if(event&&event.target)event.target.classList.add('on');
}
function filt(cat){ac=cat;document.getElementById('srch').value='';rs.forEach(r=>{r.style.display=(!ac||r.dataset.s.includes(ac))?'':'none'});document.querySelectorAll('.chip').forEach(c=>c.classList.remove('on'));if(event&&event.target)event.target.classList.add('on')}
</script>
</body></html>`;

  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','s-maxage=60,stale-while-revalidate=30');
  res.status(200).send(html);
}

function errPage(title, sub) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Erro — CVM Monitor</title></head><body style="font-family:sans-serif;padding:40px;background:#f5f6fa"><h2>❌ ${title}</h2><p style="color:#888;margin-top:8px">${sub}</p><p style="margin-top:16px"><a href="/">← Voltar</a></p></body></html>`;
}
