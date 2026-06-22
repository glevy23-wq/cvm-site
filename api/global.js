// global.js — Todos os docs CVM, paginado, fetch nativo
const SUPA = process.env.SUPABASE_URL || 'https://emumlldqewikrvbdfesd.supabase.co';
const KEY  = () => process.env.SUPABASE_SERVICE_KEY;

const TOTAL_APPROX = 1019880; // atualizar periodicamente

const CATS_CHIPS = [
  {label:'🔴 Fatos Relevantes', val:'Fato Relevante'},
  {label:'📄 FRE',              val:'Formulário de Referência'},
  {label:'🏛 Assembleias',      val:'Assembleia'},
  {label:'📢 Comunicados',      val:'Comunicado ao Mercado'},
  {label:'💰 DFP/ITR',          val:'Dados Econômico-Financeiros'},
  {label:'👁 Insider/VLMO',     val:'Valores Mobiliários negociados'},
];

module.exports = async function handler(req, res) {
  if (!KEY()) { res.status(500).send('Config error — missing SUPABASE_SERVICE_KEY'); return; }

  const page = Math.max(0, parseInt(req.query.page || '0'));
  const cat  = (req.query.cat  || '').slice(0, 100);
  const q    = (req.query.q    || '').slice(0, 100);
  const ano  = (req.query.ano  || '').slice(0, 4);
  const PAGE = 200;
  const offset = page * PAGE;

  // Construir query string
  let params = `select=dtreceb,dtrefer,categdoc,assunto,empresa,ticker,linkdoc,cdcvm&order=dtreceb.desc&limit=${PAGE}&offset=${offset}`;
  if (cat) params += `&tipodoc=ilike.*${encodeURIComponent(cat)}*`;
  if (ano) params += `&dtreceb=gte.${ano}-01-01&dtreceb=lte.${ano}-12-31`;
  if (q) {
    const qenc = encodeURIComponent(q);
    params += `&or=(empresa.ilike.*${qenc}*,assunto.ilike.*${qenc}*,categdoc.ilike.*${qenc}*)`;
  }

  let docs = [], total = TOTAL_APPROX;
  try {
    const resp = await fetch(`${SUPA}/rest/v1/filings?${params}`, {
      headers: {
        apikey: KEY(),
        Authorization: `Bearer ${KEY()}`,
        Prefer: 'count=exact', Range: '0-0',
      }
    });
    docs = await resp.json();
    const cr = resp.headers.get('content-range') || '';
    if (cr.includes('/')) total = parseInt(cr.split('/')[1]) || total;
    if (!Array.isArray(docs)) {
      res.status(500).send('Supabase error: ' + JSON.stringify(docs).slice(0,200));
      return;
    }
  } catch(e) {
    res.status(500).send('Fetch error: ' + e.message);
    return;
  }

  const totalPages = Math.ceil(total / PAGE);
  const buildLink = (p, extra='') => {
    let l = `/global?page=${p}`;
    if (cat) l += `&cat=${encodeURIComponent(cat)}`;
    if (q)   l += `&q=${encodeURIComponent(q)}`;
    if (ano) l += `&ano=${ano}`;
    return l + extra;
  };

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Global CVM — ${total.toLocaleString('pt-BR')} documentos</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,sans-serif;background:#f0f2f5;color:#222;font-size:13px}
.hdr{background:#1a1a2e;color:#fff;padding:12px 20px;display:flex;align-items:center;gap:12px}
.hdr-title{font-size:15px;font-weight:700}
.hdr-sub{font-size:10px;color:#aaa;margin-top:2px}
.bk{color:#fff;font-size:18px;text-decoration:none;margin-right:2px}
.wrap{max-width:1400px;margin:0 auto;padding:12px}
form.bar{background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.08);padding:10px 14px;margin-bottom:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
form.bar input{flex:1;min-width:160px;padding:7px 10px;border:1px solid #ddd;border-radius:6px;font-size:12px;outline:none}
form.bar input:focus{border-color:#1a1a2e}
form.bar select{padding:7px 9px;border:1px solid #ddd;border-radius:6px;font-size:11px;background:#fff;outline:none}
form.bar button{padding:7px 14px;background:#1a1a2e;color:#fff;border:none;border-radius:6px;font-size:11px;cursor:pointer}
.chips{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px}
a.chip{padding:4px 10px;background:#f0f4ff;border-radius:14px;font-size:10px;border:1px solid #dde;white-space:nowrap;text-decoration:none;color:#333}
a.chip:hover,a.chip.on{background:#1a1a2e;color:#fff;border-color:#1a1a2e}
.card{background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.08);overflow:hidden}
.ch{padding:9px 14px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between}
.ch h2{font-size:11px;font-weight:700}
.ch small{font-size:9px;color:#aaa}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:7px 10px;font-size:9px;color:#888;font-weight:700;text-transform:uppercase;background:#fafafa;border-bottom:1px solid #eee;white-space:nowrap}
td{padding:6px 10px;font-size:11px;border-bottom:1px solid #f8f8f8;vertical-align:middle;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
td.wide{max-width:220px}td.wass{max-width:260px;color:#555}
tr:hover td{background:#fafafa}
.tk{display:inline-block;background:#1a1a2e;color:#fff;padding:1px 5px;border-radius:3px;font-size:9px;font-weight:700;margin-right:2px}
.lnk{color:#1a73e8;text-decoration:none;font-size:13px}
.pager{display:flex;align-items:center;justify-content:space-between;padding:8px 14px;background:#fafafa;font-size:11px;color:#666;border-top:1px solid #eee;flex-wrap:wrap;gap:6px}
a.pb{padding:5px 13px;border:1px solid #ddd;border-radius:6px;font-size:11px;text-decoration:none;color:#222;background:#fff}
a.pb:hover{background:#1a1a2e;color:#fff;border-color:#1a1a2e}
a.pb.dis{opacity:.4;pointer-events:none}
footer{text-align:center;padding:12px;color:#aaa;font-size:10px;border-top:1px solid #eee;margin-top:10px}
</style>
</head>
<body>
<div class="hdr">
  <a class="bk" href="/">←</a>
  <div>
    <div class="hdr-title">📋 Global CVM — Todos os Documentos</div>
    <div class="hdr-sub">${total.toLocaleString('pt-BR')} docs${cat?' · filtro: '+cat:''}${q?' · busca: '+q:''}${ano?' · ano: '+ano:''} · Página ${page+1}/${totalPages.toLocaleString('pt-BR')}</div>
  </div>
</div>

<div class="wrap">
  <form class="bar" method="GET" action="/global">
    <input name="q" value="${q.replace(/"/g,'&quot;')}" placeholder="🔍 Empresa, categoria, assunto..." autocomplete="off">
    <select name="ano" onchange="this.form.submit()">
      <option value="">Todos os anos</option>
      ${[2026,2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015,2014,2013,2012,2011,2010,2009,2008,2007,2006,2005,2004,2003].map(y=>`<option value="${y}"${ano==String(y)?' selected':''}>${y}</option>`).join('')}
    </select>
    <button type="submit">Buscar</button>
    ${q||cat||ano?`<a href="/global" style="padding:7px 10px;border:1px solid #ddd;border-radius:6px;font-size:11px;text-decoration:none;color:#888">✕</a>`:''}
  </form>

  <div class="chips">
    <a href="${buildLink(0,'').replace('?page=0','')}" class="chip${!cat?' on':''}">📋 Todos</a>
    ${CATS_CHIPS.map(c=>`<a href="/global?cat=${encodeURIComponent(c.val)}${ano?'&ano='+ano:''}" class="chip${cat.startsWith(c.val.slice(0,10))?' on':''}">${c.label}</a>`).join('')}
    <a href="/fechamento" class="chip" style="border-color:#e74c3c;color:#e74c3c">🏛 Fechamentos</a>
  </div>

  <div class="card">
    <div class="ch">
      <h2>📋 ${docs.length} docs desta página</h2>
      <small>${offset+1}–${Math.min(offset+PAGE,total)} de ${total.toLocaleString('pt-BR')}</small>
    </div>
    <div style="overflow-x:auto">
    <table>
      <thead><tr><th>Entrega</th><th>Empresa</th><th>Categoria</th><th>Assunto</th><th>Ref.</th><th>PDF</th></tr></thead>
      <tbody>
        ${docs.map(f => {
          const dt   = (f.dtreceb||'').slice(0,10);
          const dtr  = (f.dtrefer||'').slice(0,10);
          const nome = (f.empresa||'').slice(0,33);
          const catl = (f.tipodoc||'—').slice(0,50);
          const ass  = (f.assunto||'').slice(0,65);
          const tk   = f.ticker||'';
          const lnk  = f.linkdoc||'';
          const cd   = f.cdcvm||'';
          const href = tk ? '/empresa/'+tk : '/empresa?cdcvm='+parseInt(cd);
          return '<tr>'+
            '<td style="white-space:nowrap">'+dt+'</td>'+
            '<td class="wide"><a href="'+href+'" style="color:#1a1a2e;text-decoration:none">'+
            (tk?'<span class="tk">'+tk+'</span>':'')+nome+'</a></td>'+
            '<td class="wide">'+catl+'</td>'+
            '<td class="wass">'+ass+'</td>'+
            '<td style="color:#aaa;font-size:10px;white-space:nowrap">'+dtr+'</td>'+
            '<td>'+(lnk?'<a class="lnk" href="'+lnk+'" target="_blank">📄</a>':'')+'</td>'+
            '</tr>';
        }).join('')}
      </tbody>
    </table>
    </div>
    <div class="pager">
      <a class="pb${page===0?' dis':''}" href="${buildLink(page-1)}">← Anterior</a>
      <span>Página ${page+1} de ${totalPages.toLocaleString('pt-BR')} · ${total.toLocaleString('pt-BR')} docs no total</span>
      <a class="pb${page>=totalPages-1?' dis':''}" href="${buildLink(page+1)}">Próxima →</a>
    </div>
  </div>
</div>
<footer>cvm-monitor.vercel.app · 1M+ docs · Zero IA · <a href="/" style="color:#aaa">← Início</a></footer>
</body></html>`;

  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','s-maxage=60,stale-while-revalidate=30');
  res.status(200).send(html);
}
