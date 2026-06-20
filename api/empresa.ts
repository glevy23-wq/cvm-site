export const config = {
  runtime: 'edge',
  regions: ['gru1'], // São Paulo
};

// cvmEmpresa — Página de empresa CVM com credenciais embutidas
// Uso: ?cdcvm=009512 ou ?ticker=PETR4 ou ?ticker=AXIA5

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  let cdcvm = (url.searchParams.get("cdcvm") || "").trim().replace(/-/g, "").padStart(6, "0");
  const ticker = (url.searchParams.get("ticker") || "").trim().toUpperCase();
  const yearFilter = (url.searchParams.get("year") || "").trim();

  const SUPA = "https://emumlldqewikrvbdfesd.supabase.co/rest/v1";
  const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtdW1sbGRxZXdpa3J2YmRmZXNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzc1MjkxOSwiZXhwIjoyMDkzMzI4OTE5fQ.GwOXpKEkm74qTzYJMU1VY1g1M5fnR-DYWUqohrus1JU";
  const H: Record<string, string> = { apikey: KEY, Authorization: `Bearer ${KEY}` };

  if (!cdcvm.replace(/^0+/, "") && !ticker) {
    return new Response("Informe ?cdcvm=NNNN ou ?ticker=PETR4", { status: 400 });
  }

  // Resolver ticker → cdcvm (busca em empresas_b3, fallback denom_social)
  if (!cdcvm.replace(/^0+/, "") && ticker) {
    const rt = await fetch(`${SUPA}/empresas_b3?ticker=eq.${encodeURIComponent(ticker)}&select=cdcvm&limit=1`, { headers: H });
    const bt = await rt.json();
    if (bt?.[0]?.cdcvm) {
      cdcvm = bt[0].cdcvm.replace(/-/g, "").padStart(6, "0");
    } else {
      // Fallback: busca por prefixo do ticker no nome
      const prefix = ticker.replace(/[0-9]/g, "");
      const rt2 = await fetch(`${SUPA}/empresas_b3?denom_social=ilike.*${encodeURIComponent(prefix)}*&select=cdcvm,ticker,denom_social&limit=5`, { headers: H });
      const bt2 = await rt2.json();
      if (bt2?.[0]?.cdcvm) cdcvm = bt2[0].cdcvm.replace(/-/g, "").padStart(6, "0");
    }
  }

  if (!cdcvm.replace(/^0+/, "")) {
    return new Response(`<!DOCTYPE html><html><head><meta charset=UTF-8></head><body style="font-family:system-ui;background:#0f1117;color:#e2e8f0;padding:40px"><h2>Ticker não encontrado</h2><p>Não foi possível resolver o ticker para um código CVM.</p></body></html>`,
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  // Queries paralelas
  const metaUrl = `${SUPA}/companies_landing_precomputed?cd_cvm=eq.${cdcvm}&select=ticker,denom_social,setor,cnpj,payload_json->anos,payload_json->categorias,payload_json->total_filings,payload_json->computed_at&limit=1`;
  let filingsUrl: string;
  if (yearFilter) {
    filingsUrl = `${SUPA}/filings?cdcvm=eq.${cdcvm}&dtreceb=gte.${yearFilter}-01-01&dtreceb=lte.${yearFilter}-12-31&select=dtreceb,horareceb,dtrefer,categdoc,motivo,versao,linkdoc&order=dtreceb.desc,horareceb.desc&limit=500`;
  } else {
    filingsUrl = `${SUPA}/filings?cdcvm=eq.${cdcvm}&select=dtreceb,horareceb,dtrefer,categdoc,motivo,versao,linkdoc&order=dtreceb.desc,horareceb.desc&limit=200`;
  }

  const [rMeta, rFilings] = await Promise.all([
    fetch(metaUrl, { headers: H }),
    fetch(filingsUrl, { headers: H }),
  ]);
  const [metaRaw, filingsRaw] = await Promise.all([rMeta.json(), rFilings.json()]);

  if (!Array.isArray(metaRaw) || metaRaw.length === 0) {
    return new Response(`<!DOCTYPE html><html><head><meta charset=UTF-8></head><body style="font-family:system-ui;background:#0f1117;color:#e2e8f0;padding:40px"><h2>Empresa não encontrada</h2><p>cdcvm ${cdcvm} sem dados pré-computados. Tente novamente em alguns minutos.</p></body></html>`,
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  const meta = metaRaw[0] as any;
  const empresa = meta.denom_social || `CVM ${cdcvm}`;
  const setor = meta.setor || "";
  const anos = meta.anos || {};
  const total = meta.total_filings || 0;
  const computedAt = meta.computed_at ? new Date(meta.computed_at).toLocaleDateString("pt-BR") : "";
  const docs = Array.isArray(filingsRaw) ? filingsRaw : [];

  const DATA = JSON.stringify(docs.map((d: any) => ({
    en: d.dtreceb || "",
    hr: (d.horareceb || "").slice(0, 5),
    rf: d.dtrefer || "",
    ca: d.categdoc || "",
    mo: (d.motivo || "").slice(0, 160),
    v: String(d.versao || ""),
    lk: d.linkdoc || "",
  })));

  const anos_pills = Object.keys(anos).sort().reverse().map(y =>
    `<a class="pill${yearFilter === y ? " on" : ""}" href="?cdcvm=${cdcvm}&year=${y}">${y} <span style="color:#4b5563;font-size:10px">(${anos[y]})</span></a>`
  ).join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${empresa} — CVM</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;background:#0f1117;color:#e2e8f0;font-size:13px}
header{background:#1a1d27;border-bottom:1px solid #2d3148;padding:14px 16px;position:sticky;top:0;z-index:20}
h1{font-size:17px;color:#fff;font-weight:700;letter-spacing:-.3px}
.sub{color:#6b7280;font-size:11px;margin-top:3px}
.srch{margin-top:10px;display:flex;gap:8px;align-items:center}
.srch input{flex:1;padding:9px 14px;border-radius:10px;border:1px solid #2d3148;background:#13151f;color:#e2e8f0;font-size:14px;outline:none}
.srch input:focus{border-color:#6366f1}
.cnt{color:#a5b4fc;font-size:12px;white-space:nowrap;min-width:60px;text-align:right}
.bar{display:flex;gap:6px;padding:10px 16px;overflow-x:auto;border-bottom:1px solid #2d3148;background:#13151f;align-items:center;scrollbar-width:none}
.bar::-webkit-scrollbar{display:none}
.lbl{color:#6b7280;font-size:10px;text-transform:uppercase;margin-right:4px;white-space:nowrap;flex-shrink:0}
.pill{padding:4px 12px;border-radius:14px;font-size:12px;cursor:pointer;border:1px solid #2d3148;color:#9ca3af;background:#0f1117;white-space:nowrap;flex-shrink:0;text-decoration:none;display:inline-block;transition:all .15s}
.pill:hover,.pill.on{background:#1e2560;border-color:#6366f1;color:#a5b4fc;font-weight:600}
.chips{display:flex;gap:5px;padding:8px 16px;flex-wrap:wrap;border-bottom:1px solid #2d3148;min-height:36px}
.chip{padding:3px 10px;border-radius:12px;font-size:11px;cursor:pointer;border:1px solid #2d3148;color:#9ca3af;background:#13151f;white-space:nowrap;transition:all .12s}
.chip:hover,.chip.on{background:#1e2560;border-color:#6366f1;color:#a5b4fc}
.note{padding:8px 16px;color:#4b5563;font-size:11px;border-bottom:1px solid #161922;background:#0a0b10}
.wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;min-width:640px}
thead th{text-align:left;padding:9px 12px;color:#6b7280;font-size:11px;font-weight:600;border-bottom:1px solid #2d3148;cursor:pointer;white-space:nowrap;background:#1a1d27;letter-spacing:.3px;text-transform:uppercase}
thead th:hover{color:#a5b4fc}
td{padding:8px 12px;border-bottom:1px solid #161922;vertical-align:middle}
tr:hover td{background:#13162a}
.c-date{color:#9ca3af;font-variant:tabular-nums;white-space:nowrap;font-size:12px}
.c-yr{color:#fbbf24;font-weight:600}
.c-cat a{color:#818cf8;text-decoration:none;font-weight:500}
.c-cat a:hover{text-decoration:underline}
.c-mo{color:#7c8699;font-size:11px;line-height:1.4}
.c-v{color:#374151;font-size:11px}
.c-act a{color:#34d399;text-decoration:none;font-size:11px;font-weight:500}
.c-act a:hover{text-decoration:underline}
.empty{padding:60px;text-align:center;color:#374151;font-size:14px}
</style>
</head>
<body>
<header>
  <h1>📋 ${empresa}</h1>
  <div class="sub">${total.toLocaleString()} documentos CVM${setor ? " · " + setor : ""}${computedAt ? " · atualizado " + computedAt : ""}</div>
  <div class="srch">
    <input id="q" type="search" placeholder="🔍  Buscar por categoria, motivo, assunto..." autocomplete="off">
    <span class="cnt" id="cnt"></span>
  </div>
</header>
<div class="bar">
  <span class="lbl">ANO</span>
  <a class="pill${!yearFilter ? " on" : ""}" href="?cdcvm=${cdcvm}">Recentes</a>
  ${anos_pills}
</div>
<div class="chips" id="chips"></div>
${!yearFilter ? `<div class="note">⚡ Mostrando os 200 documentos mais recentes — clique num ano para ver todos daquele período</div>` : ""}
<div class="wrap">
  <table>
    <thead>
      <tr>
        <th onclick="sort('en')">Data Entrega</th>
        <th onclick="sort('rf')">Data Ref.</th>
        <th onclick="sort('ca')">Categoria</th>
        <th>Assunto / Motivo</th>
        <th onclick="sort('v')">V</th>
        <th>Ações</th>
      </tr>
    </thead>
    <tbody id="tb"></tbody>
  </table>
</div>

<script>
var ALL = ${DATA};
var catF = "";
var sortK = "en";
var sortD = -1;

function esc(s) {
  if (!s) return "";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function buildChips() {
  var counts = {};
  ALL.forEach(function(d) { if (d.ca) counts[d.ca] = (counts[d.ca]||0)+1; });
  var cats = Object.keys(counts).sort(function(a,b){ return counts[b]-counts[a]; });
  var h = '<span class="chip' + (catF===''?' on':'') + '" onclick="filterCat(this,\\'\\')">Todas</span>';
  cats.forEach(function(k) {
    var safe = k.replace(/'/g, "").replace(/"/g, "");
    h += '<span class="chip' + (catF===k?' on':'') + '" onclick="filterCat(this,\\'' + safe + '\\')">' + esc(k) + ' <span style="color:#4b5563">(' + counts[k] + ')</span></span>';
  });
  document.getElementById("chips").innerHTML = h;
}

function filterCat(el, cat) {
  catF = (catF === cat) ? "" : cat;
  document.querySelectorAll(".chip").forEach(function(c){ c.classList.remove("on"); });
  if (el && el.classList) el.classList.add("on");
  render();
}

function sort(k) {
  if (sortK === k) sortD *= -1; else { sortK = k; sortD = 1; }
  render();
}

function render() {
  var q = (document.getElementById("q").value || "").toLowerCase().trim();
  var data = ALL.filter(function(d) {
    if (catF && d.ca !== catF) return false;
    if (!q) return true;
    return (d.ca + " " + d.mo).toLowerCase().indexOf(q) >= 0;
  });
  data.sort(function(a,b) {
    var x = a[sortK] || ""; var y = b[sortK] || "";
    return x < y ? -sortD : x > y ? sortD : 0;
  });
  document.getElementById("cnt").textContent = data.length + " docs";
  if (!data.length) {
    document.getElementById("tb").innerHTML = '<tr><td colspan="6" class="empty">Nenhum resultado</td></tr>';
    return;
  }
  var rows = "";
  data.forEach(function(d) {
    rows += "<tr>" +
      "<td class='c-date'><span class='c-yr'>" + esc(d.en) + "</span>" +
      (d.hr ? " <span style='color:#6b7280;font-size:10px'>" + esc(d.hr) + "</span>" : "") + "</td>" +
      "<td class='c-date'>" + esc(d.rf) + "</td>" +
      "<td class='c-cat'><a href='" + esc(d.lk) + "' target='_blank'>" + esc(d.ca||"—") + "</a></td>" +
      "<td class='c-mo'>" + esc(d.mo) + "</td>" +
      "<td class='c-v'>v" + esc(d.v) + "</td>" +
      "<td class='c-act'><a href='" + esc(d.lk) + "' target='_blank'>PDF ↗</a></td>" +
      "</tr>";
  });
  document.getElementById("tb").innerHTML = rows;
}

document.getElementById("q").addEventListener("input", render);
buildChips();
render();
</script>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}