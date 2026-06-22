// global.js — Todos os docs CVM de todas as empresas, paginado
// Usa fetch nativo (sem @supabase/supabase-js)

const SUPA = process.env.SUPABASE_URL || 'https://emumlldqewikrvbdfesd.supabase.co';
const KEY  = () => process.env.SUPABASE_SERVICE_KEY;

const CATS = [
  'Fato Relevante',
  'Formulário de Referência',
  'Assembleia',
  'Comunicado ao Mercado',
  'Dados Econômico-Financeiros',
  'Aviso aos Acionistas',
  'Valores Mobiliários negociados e detidos',
];

export default async function handler(req, res) {
  if (!KEY()) { res.status(500).send('Config error'); return; }

  const page = parseInt(req.query.page || '0');
  const cat  = req.query.cat  || '';
  const q    = req.query.q    || '';
  const ano  = req.query.ano  || '';
  const PAGE_SIZE = 200;
  const offset = page * PAGE_SIZE;

  // Construir query Supabase REST com filtros
  let qs = `select=dtreceb,dtrefer,categdoc,assunto,denom_social,ticker,linkdoc,cdcvm&order=dtreceb.desc&limit=${PAGE_SIZE}&offset=${offset}`;
  if (cat) qs += `&categdoc=ilike.*${encodeURIComponent(cat)}*`;
  if (q)   qs += `&or=(denom_social.ilike.*${encodeURIComponent(q)}*,assunto.ilike.*${encodeURIComponent(q)}*,categdoc.ilike.*${encodeURIComponent(q)}*)`;
  if (ano) qs += `&dtreceb=gte.${ano}-01-01&dtreceb=lte.${ano}-12-31`;

  const [docsResp, countResp] = await Promise.all([
    fetch(`${SUPA}/rest/v1/filings?${qs}`, {
      headers: { apikey: KEY(), Authorization: `Bearer ${KEY()}` }
    }),
    fetch(`${SUPA}/rest/v1/filings?${qs.replace(/&limit=\d+&offset=\d+/,'')}&select=id`, {
      headers: { apikey: KEY(), Authorization: `Bearer ${KEY()}`, Prefer: 'count=exact', Range: '0-0' }
    })
  ]);

  const docs = await docsResp.json();
  const countHeader = countResp.headers.get('content-range') || '0/1019880';
  const total = parseInt(countHeader.split('/')[1]) || 1019880;

  if (!Array.isArray(docs)) {
    res.status(500).send('Supabase error: ' + JSON.stringify(docs).slice(0,200));
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Global CVM — Todos os Documentos</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,sans-serif;background:#f0f2f5;color:#222;font-size:13px}
.hdr{background:#1a1a2e;color:#fff;padding:12px 20px;display:flex;align-items:center;gap:12px}
.hdr-title{font-size:15px;font-weight:700}
.hdr-sub{font-size:10px;color:#aaa;margin-top:2px}
.bk{color:#fff;font-size:18px;text-decoration:none}
.wrap{max-width:1400px;margin:0 auto;padding:12px}
.bar{background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.08);padding:11px 16px;margin-bottom:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.bar input{flex:1;min-width:180px;padding:7px 11px;border:1px solid #ddd;border-radius:6px;font-size:12px;outline:none}
.bar input:focus{border-color:#1a1a2e}
.bar select{padding:7px 10px;border:1px solid #ddd;border-radius:6px;font-size:11px;background:#fff;outline:none}
.chips{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px}
.chip{padding:4px 10px;background:#f0f4ff;border-radius:14px;font-size:10px;cursor:pointer;border:1px solid #dde;white-space:nowrap;text-decoration:none;color:#333}
.chip:hover,.chip.on{background:#1a1a2e;color:#fff;border-color:#1a1a2e}
.card{background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.08);overflow:hidden}
.ch{padding:9px 16px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between}
.ch h2{font-size:12px;font-weight:700}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:7px 11px;font-size:9px;color:#888;font-weight:700;text-transform:uppercase;background:#fafafa;border-bottom:1px solid #eee;white-space:nowrap}
td{padding:7px 11px;font-size:11px;border-bottom:1px solid #f8f8f8;vertical-align:middle;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
tr:hover td{background:#fafafa}
.tk{display:inline-block;background:#1a1a2e;color:#fff;padding:1px 5px;border-radius:3px;font-size:9px;font-weight:700;text-decoration:none;margin-right:3px}
.lnk{color:#1a73e8;text-decoration:none;font-size:13px}
.pager{display:flex;align-items:center;justify-content:space-between;padding:9px 16px;background:#fafafa;font-size:11px;color:#666;border-top:1px solid #eee}
a.pbtn{padding:5px 14px;border:1px solid #ddd;border-radius:6px;font-size:11px;text-decoration:none;color:#222;background:#fff}
a.pbtn:hover{background:#1a1a2e;color:#fff;border-color:#1a1a2e}
a.pbtn.dis{opacity:.4;pointer-events:none}
footer{text-align:center;padding:14px;color:#aaa;font-size:10px;border-top:1px solid #eee;margin-top:12px}
</style>
</head>
<body>
<div class="hdr">
  <a class="bk" href="/">←</a>
  <div>
    <div class="hdr-title">📋 Global CVM — Todos os Documentos</div>
    <div class="hdr-sub">${total.toLocaleString('pt-BR')} documentos${cat?' · '+cat:''}${q?' · '+q:''}${ano?' · '+ano:''}</div>
  </div>
</div>

<div class="wrap">
  <form class="bar" method="GET" action="/global">
    <input type="text" name="q" value="${q}" placeholder="🔍 Empresa, categoria, assunto..." autocomplete="off">
    <select name="ano" onchange="this.form.submit()">
      <option value="">Todos os anos</option>
      ${[2026,2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015,2014,2013,2012,2011,2010,2009,2008,2007,2006,2005,2004,2003].map(y=>`<option value="${y}"${ano==y?' selected':''}>${y}</option>`).join('')}
    </select>
    <button type="submit" style="padding:7px 14px;background:#1a1a2e;color:#fff;border:none;border-radius:6px;font-size:11px;cursor:pointer">Buscar</button>
    ${q||cat||ano?'<a href="/global" style="padding:7px 11px;border:1px solid #ddd;border-radius:6px;font-size:11px;text-decoration:none;color:#666">✕ Limpar</a>':''}
  </form>

  <div class="chips">
    <a href="/global${ano?'?ano='+ano:''}" class="chip${!cat?' on':''}">📋 Todos</a>
    ${CATS.map(c => `<a href="/global?cat=${encodeURIComponent(c)}${ano?'&ano='+ano:''}" class="chip${cat===c?' on':''}">${c.slice(0,38)}</a>`).join('')}
  </div>

  <div class="card">
    <div class="ch">
      <h2>📋 ${total.toLocaleString('pt-BR')} documentos — Página ${page+1}</h2>
      <span style="font-size:9px;color:#aaa">${offset}–${Math.min(offset+PAGE_SIZE,total)} de ${total.toLocaleString('pt-BR')}</span>
    </div>
    <div style="overflow-x:auto">
    <table>
      <thead><tr>
        <th>Entrega</th><th>Empresa</th><th>Categoria</th><th>Assunto</th><th>Referência</th><th>PDF</th>
      </tr></thead>
      <tbody>
        ${docs.map(f => {
          const dt   = (f.dtreceb||'').slice(0,10);
          const dtr  = (f.dtrefer||'').slice(0,10);
          const cat_l= (f.categdoc||'—').slice(0,50);
          const ass  = (f.assunto||'').slice(0,70);
          const nome = (f.denom_social||'').slice(0,35);
          const tk   = f.ticker||'';
          const lnk  = f.linkdoc||'';
          const cdcvm= f.cdcvm||'';
          const href = tk ? '/empresa/'+tk : '/empresa?cdcvm='+parseInt(cdcvm);
          return '<tr>'+
            '<td style="white-space:nowrap">'+dt+'</td>'+
            '<td><a href="'+href+'" style="color:#1a1a2e;text-decoration:none">'+
            (tk?'<span class="tk">'+tk+'</span>':'')+nome+'</a></td>'+
            '<td>'+cat_l+'</td>'+
            '<td style="color:#555">'+ass+'</td>'+
            '<td style="color:#aaa;font-size:10px">'+dtr+'</td>'+
            '<td>'+(lnk?'<a class="lnk" href="'+lnk+'" target="_blank">📄</a>':'')+'</td>'+
            '</tr>';
        }).join('')}
      </tbody>
    </table>
    </div>
    <div class="pager">
      <a href="/global?page=${page-1}${cat?'&cat='+encodeURIComponent(cat):''}${q?'&q='+encodeURIComponent(q):''}${ano?'&ano='+ano:''}" 
         class="pbtn${page===0?' dis':''}">← Anterior</a>
      <span>Página ${page+1} / ${Math.ceil(total/PAGE_SIZE)} · ${total.toLocaleString('pt-BR')} docs</span>
      <a href="/global?page=${page+1}${cat?'&cat='+encodeURIComponent(cat):''}${q?'&q='+encodeURIComponent(q):''}${ano?'&ano='+ano:''}" 
         class="pbtn${offset+PAGE_SIZE>=total?' dis':''}">Próxima →</a>
    </div>
  </div>
</div>
<footer>cvm-monitor.vercel.app · 1M+ docs CVM · Zero IA · <a href="/" style="color:#aaa">← Início</a> · <a href="/fechamento" style="color:#e74c3c">🏛 Fechamento de Capital</a></footer>
</body></html>`;

  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','s-maxage=60,stale-while-revalidate=30');
  res.status(200).send(html);
}
