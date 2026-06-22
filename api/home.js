// home.js — Homepage CVM Monitor
// Fonte: empresas_b3 (ticker real, nome, cdcvm)

const SUPA = process.env.SUPABASE_URL || 'https://emumlldqewikrvbdfesd.supabase.co';
const KEY  = () => process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  if (!KEY()) { res.status(500).send('Config error'); return; }

  const r = await fetch(`${SUPA}/rest/v1/empresas_b3?select=cdcvm,ticker,denom_social,situacao&limit=700`, {
    headers: { apikey: KEY(), Authorization: `Bearer ${KEY()}` }
  });
  const rawEmpresas = await r.json();

  // Com ticker real B3 (4-5 chars começando com letra)
  const comTicker = rawEmpresas.filter(e => e.ticker && e.ticker.length >= 4 && /^[A-Z]/.test(e.ticker));
  const semTicker = rawEmpresas.filter(e => !e.ticker || e.ticker.length < 4 || !/^[A-Z]/.test(e.ticker));

  comTicker.sort((a,b) => a.ticker.localeCompare(b.ticker));
  semTicker.sort((a,b) => (a.denom_social||'').localeCompare(b.denom_social||''));

  const todas = [...comTicker, ...semTicker];
  const total = todas.length;
  const nTk = comTicker.length;

  const cards = todas.map(e => {
    const tk    = (e.ticker && e.ticker.length >= 4 && /^[A-Z]/.test(e.ticker)) ? e.ticker : null;
    const cdcvm = e.cdcvm || '';
    const nome  = (e.denom_social || '').trim();
    const slug  = tk || cdcvm;
    const label = tk
      ? `<div class="tk">${tk}</div><div class="nm">${nome.slice(0,38)}</div>`
      : `<div class="nm2">${nome.slice(0,40)}</div><div class="cd">CDCVM ${parseInt(cdcvm)}</div>`;
    const srch = `${tk||''} ${nome} ${parseInt(cdcvm)}`.toLowerCase();
    return `<a class="card${tk?'':' nc'}" href="/empresa/${slug}" data-s="${srch}" data-tk="${tk||''}">${label}</a>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CVM Monitor</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f6fa}
.hdr{background:#1a1a2e;color:#fff;padding:28px 20px;text-align:center}
.hdr h1{font-size:28px;font-weight:800}
.hdr p{color:#8892b0;margin-top:8px;font-size:13px}
.sw{max-width:640px;margin:20px auto;padding:0 16px}
.sb{position:relative}
.sb input{width:100%;padding:16px 20px 16px 48px;border:none;border-radius:12px;font-size:16px;box-shadow:0 4px 20px rgba(0,0,0,.15);outline:none}
.sb::before{content:'🔍';position:absolute;left:16px;top:50%;transform:translateY(-50%);font-size:18px;pointer-events:none}
.si{text-align:center;color:#999;font-size:11px;margin-top:8px}
.tabs{max-width:1200px;margin:0 auto;padding:0 16px 10px;display:flex;gap:8px}
.tab{padding:6px 14px;border-radius:20px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid #ddd;background:#fff;color:#666}
.tab.on{background:#1a1a2e;color:#fff;border-color:#1a1a2e}
.grid{max-width:1200px;margin:0 auto;padding:0 16px 48px;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}
.card{background:#fff;border-radius:10px;padding:14px;box-shadow:0 1px 4px rgba(0,0,0,.08);text-decoration:none;color:inherit;display:block;border:1px solid #eee}
.card:hover{transform:translateY(-2px);box-shadow:0 5px 15px rgba(0,0,0,.15);border-color:#e74c3c}
.card.nc{border-left:3px solid #bbb}
.tk{font-size:19px;font-weight:800;color:#e74c3c}
.nm{font-size:10px;color:#666;margin-top:4px;line-height:1.3}
.nm2{font-size:11px;font-weight:600;color:#333;line-height:1.3}
.cd{font-size:9px;color:#aaa;margin-top:3px}
.nores{display:none;text-align:center;padding:48px;color:#888;grid-column:1/-1}
footer{text-align:center;padding:24px;color:#aaa;font-size:10px;border-top:1px solid #eee}
</style>
</head>
<body>
<div class="hdr">
  <h1>📋 CVM Monitor</h1>
  <p>${total} empresas · 1M+ documentos · Actualizado 15min</p>
</div>
<div class="sw">
  <div class="sb">
    <input type="text" id="q" placeholder="Buscar por ticker (PETR4) ou nome (Petrobras, Vale)..." oninput="buscar(this.value)" autocomplete="off" autocorrect="off" spellcheck="false">
  </div>
  <div class="si" id="si">${nTk} com ticker B3 · ${total-nTk} sem ticker · busca fuzzy (tolera erros)</div>
</div>
<div class="tabs">
  <span class="tab on" id="ta" onclick="ft('')">Todas (${total})</span>
  <span class="tab" id="tt" onclick="ft('tk')">Com ticker (${nTk})</span>
  <span class="tab" id="tn" onclick="ft('no')">Sem ticker (${total-nTk})</span>
</div>
<div class="grid" id="g">
  ${cards}
  <div class="nores" id="nr"><h3>Nenhuma empresa encontrada</h3><p>Tente parte do nome ou ticker</p></div>
</div>
<footer>cvm-monitor.vercel.app · <a href="/fechamento" style="color:#e74c3c">🏛 Fechamento de Capital</a> · CVM ENET · Zero IA · Open data</footer>
<script>
function norm(s){return(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function fuzzy(q,s){
  const nq=norm(q),ns=norm(s);
  if(ns.includes(nq))return true;
  const words=nq.split(/\s+/);
  if(words.every(w=>ns.includes(w)))return true;
  if(nq.length>=3){let i=0;for(let j=0;j<ns.length&&i<nq.length;j++)if(ns[j]===nq[i])i++;if(i/nq.length>=0.8)return true;}
  return false;
}
const cs=[...document.querySelectorAll('.card')];
let at='';
function ft(tab){
  at=tab;
  ['ta','tt','tn'].forEach(id=>document.getElementById(id).classList.remove('on'));
  document.getElementById(tab===''?'ta':tab==='tk'?'tt':'tn').classList.add('on');
  buscar(document.getElementById('q').value);
}
function buscar(q){
  let v=0;
  cs.forEach(c=>{
    const hasTk=c.dataset.tk.length>0;
    const tabOk=at===''||(at==='tk'&&hasTk)||(at==='no'&&!hasTk);
    const qOk=!q||fuzzy(q,c.dataset.s);
    c.style.display=(tabOk&&qOk)?'':'none';
    if(tabOk&&qOk)v++;
  });
  const si=document.getElementById('si');
  if(q)si.textContent=v+' empresa'+(v!==1?'s':'')+' encontrada'+(v!==1?'s':'');
  else si.textContent='${nTk} com ticker B3 · ${total-nTk} sem ticker · busca fuzzy (tolera erros)';
  document.getElementById('nr').style.display=v===0?'block':'none';
}
if(window.innerWidth>768)document.getElementById('q').focus();
</script>
</body></html>`;

  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','s-maxage=300,stale-while-revalidate=60');
  res.status(200).send(html);
}
