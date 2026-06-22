
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  const SUPA = process.env.SUPABASE_URL || 'https://emumlldqewikrvbdfesd.supabase.co';
  const KEY  = process.env.SUPABASE_SERVICE_KEY;
  if (!KEY) { res.status(500).send('Config error'); return; }

  const sb = createClient(SUPA, KEY);

  // Parâmetros
  const page   = parseInt(req.query.page || '0');
  const cat    = req.query.cat || '';
  const q      = req.query.q  || '';
  const ano    = req.query.ano || '';
  const PAGE_SIZE = 200;

  // Query base
  let query = sb.from('filings')
    .select('dtreceb,dtrefer,categdoc,assunto,denom_social,ticker,linkdoc,cdcvm', { count: 'exact' })
    .order('dtreceb', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  if (cat)  query = query.ilike('categdoc', `%${cat}%`);
  if (q)    query = query.or(`denom_social.ilike.%${q}%,assunto.ilike.%${q}%,categdoc.ilike.%${q}%`);
  if (ano)  query = query.gte('dtreceb', `${ano}-01-01`).lte('dtreceb', `${ano}-12-31`);

  const { data, count, error } = await query;
  if (error) { res.status(500).send(JSON.stringify(error)); return; }

  // Categorias únicas para chips (pré-computado)
  const CATS = [
    'Fato Relevante','Formulário de Referência','Assembleia','Comunicado ao Mercado',
    'Dados Econômico-Financeiros','Aviso aos Acionistas','Reunião da Administração',
    'Valores Mobiliários negociados e detidos'
  ];

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Global CVM — Todos os Documentos</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,sans-serif;background:#f5f5f5;color:#222}
.hdr{background:#1a1a2e;color:#fff;padding:12px 20px;display:flex;align-items:center;gap:14px}
.hdr-title{font-size:15px;font-weight:700}
.hdr-sub{font-size:10px;color:#aaa;margin-top:2px}
.bk{color:#fff;font-size:20px;text-decoration:none;margin-right:4px}
.wrap{max-width:1400px;margin:0 auto;padding:14px}
.bar{background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.08);padding:12px 16px;margin-bottom:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.bar input{flex:1;min-width:200px;padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:12px;outline:none}
.bar input:focus{border-color:#1a1a2e}
.bar select{padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:12px;outline:none;background:#fff}
.chips{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px}
.chip{padding:4px 10px;background:#f0f4ff;border-radius:14px;font-size:10px;cursor:pointer;border:1px solid #dde;white-space:nowrap;text-decoration:none;color:#333}
.chip:hover,.chip.on{background:#1a1a2e;color:#fff;border-color:#1a1a2e}
.card{background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.08);overflow:hidden}
.ch{padding:10px 16px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between}
.ch h2{font-size:12px;font-weight:700}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:8px 12px;font-size:9px;color:#888;font-weight:700;text-transform:uppercase;background:#fafafa;border-bottom:1px solid #eee;white-space:nowrap}
td{padding:7px 12px;font-size:11px;border-bottom:1px solid #f8f8f8;vertical-align:middle}
.tc{max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ta{max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#555}
.te{max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
tr:hover td{background:#fafafa}
.tk{display:inline-block;background:#1a1a2e;color:#fff;padding:1px 6px;border-radius:3px;font-size:9px;font-weight:700;text-decoration:none}
.lnk{color:#1a73e8;text-decoration:none;font-size:14px}
.pager{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#fafafa;font-size:11px;color:#666;border-top:1px solid #eee}
.pbtn{padding:5px 14px;border:1px solid #ddd;border-radius:6px;cursor:pointer;background:#fff;font-size:11px;text-decoration:none;color:#222}
.pbtn:hover{background:#1a1a2e;color:#fff;border-color:#1a1a2e}
.pbtn.dis{opacity:.4;pointer-events:none}
footer{text-align:center;padding:16px;color:#aaa;font-size:10px;border-top:1px solid #eee;margin-top:12px}
</style>
</head>
<body>
<div class="hdr">
  <a class="bk" href="/">←</a>
  <div>
    <div class="hdr-title">📋 Global CVM — Todos os Documentos</div>
    <div class="hdr-sub">${(count || 0).toLocaleString('pt-BR')} documentos${cat ? ' · filtro: '+cat : ''}${q ? ' · busca: '+q : ''}${ano ? ' · ano: '+ano : ''}</div>
  </div>
</div>

<div class="wrap">
  <form class="bar" method="GET" action="/global">
    <input type="text" name="q" value="${q}" placeholder="🔍 Buscar empresa, categoria, assunto..." autocomplete="off">
    <select name="ano" onchange="this.form.submit()">
      <option value="">Todos os anos</option>
      ${[2026,2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015,2014,2013,2012,2011,2010,2009,2008,2007,2006,2005,2004,2003].map(y=>`<option value="${y}"${ano==y?' selected':''}>${y}</option>`).join('')}
    </select>
    <button type="submit" style="padding:8px 16px;background:#1a1a2e;color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer">Buscar</button>
    ${q||cat||ano ? '<a href="/global" style="padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:11px;text-decoration:none;color:#666">Limpar</a>' : ''}
  </form>

  <div class="chips">
    <a href="/global${ano?'?ano='+ano:''}" class="chip${!cat?' on':''}">📋 Todos</a>
    ${CATS.map(c => `<a href="/global?cat=${encodeURIComponent(c)}${ano?'&ano='+ano:''}" class="chip${cat===c?' on':''}">${c.slice(0,40)}</a>`).join('')}
  </div>

  <div class="card">
    <div class="ch">
      <h2>📋 ${(count||0).toLocaleString('pt-BR')} documentos — Página ${page+1}</h2>
      <span style="font-size:9px;color:#aaa">${page*200}–${Math.min((page+1)*200, count||0)} de ${(count||0).toLocaleString('pt-BR')}</span>
    </div>
    <div style="overflow-x:auto">
    <table>
      <thead><tr>
        <th>Entrega</th><th>Empresa</th><th>Categoria</th><th>Assunto</th><th>Ref.</th><th>PDF</th>
      </tr></thead>
      <tbody>
        ${(data||[]).map(f => {
          const dt  = (f.dtreceb||'').slice(0,10);
          const dtr = (f.dtrefer||'').slice(0,10);
          const cat_label = (f.categdoc||'-').slice(0,55);
          const ass = (f.assunto||'').slice(0,70);
          const nome = (f.denom_social||'').slice(0,35);
          const tk   = f.ticker || '';
          const lnk  = f.linkdoc || '';
          const cdcvm= f.cdcvm || '';
          return `<tr>
            <td style="white-space:nowrap">${dt}</td>
            <td class="te"><a href="/empresa/${tk||'?cdcvm='+parseInt(cdcvm)}" style="color:#1a1a2e;text-decoration:none">${tk?`<span class="tk">${tk}</span> `:''}${nome}</a></td>
            <td class="tc">${cat_label}</td>
            <td class="ta">${ass}</td>
            <td style="white-space:nowrap;color:#aaa;font-size:10px">${dtr}</td>
            <td>${lnk?`<a class="lnk" href="${lnk}" target="_blank">📄</a>`:''}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    </div>
    <div class="pager">
      <a href="/global?page=${page-1}${cat?'&cat='+encodeURIComponent(cat):''}${q?'&q='+encodeURIComponent(q):''}${ano?'&ano='+ano:''}" class="pbtn${page===0?' dis':''}">← Anterior</a>
      <span>Página ${page+1} de ${Math.ceil((count||1)/200)}</span>
      <a href="/global?page=${page+1}${cat?'&cat='+encodeURIComponent(cat):''}${q?'&q='+encodeURIComponent(q):''}${ano?'&ano='+ano:''}" class="pbtn${(page+1)*200>=(count||0)?' dis':''}">Próxima →</a>
    </div>
  </div>
</div>
<footer>cvm-monitor.vercel.app · 1M+ docs CVM · Zero IA · <a href="/" style="color:#aaa">← Início</a></footer>
</body></html>`;

  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','s-maxage=120,stale-while-revalidate=60');
  res.status(200).send(html);
};
