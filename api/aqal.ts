export const config = { runtime: 'edge', regions: ['gru1'] };

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const SUPA = "https://emumlldqewikrvbdfesd.supabase.co/rest/v1";
  const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtdW1sbGRxZXdpa3J2YmRmZXNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzc1MjkxOSwiZXhwIjoyMDkzMzI4OTE5fQ.GwOXpKEkm74qTzYJMU1VY1g1M5fnR-DYWUqohrus1JU";
  const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 200);
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const offset = (page - 1) * limit;

  const r = await fetch(`${SUPA}/aq_al_processed?select=*&order=data_entrega.desc,hora_entrega.desc&limit=${limit}&offset=${offset}`, { headers: H });
  const data = await r.json();
  const count = r.headers.get("content-range")?.split("/")[1] ?? "?";

  if (url.searchParams.get("format") === "json") {
    return new Response(JSON.stringify({ total: count, page, data }), { headers: { "Content-Type": "application/json" } });
  }

  const rows = Array.isArray(data) ? data : [];
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AQ/AL — CVM Monitor</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif;background:#0f1117;color:#e2e8f0;padding:0}
header{background:#1a1d27;border-bottom:1px solid #2d3748;padding:16px 24px;display:flex;align-items:center;gap:12px}
header a{color:#7c3aed;text-decoration:none;font-weight:700;font-size:18px}
header span{color:#64748b;font-size:13px}
.container{max-width:1200px;margin:0 auto;padding:24px 16px}
h2{font-size:22px;font-weight:700;margin-bottom:16px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{background:#1a1d27;padding:10px 12px;text-align:left;border-bottom:2px solid #2d3748;white-space:nowrap;color:#94a3b8;font-weight:600}
td{padding:10px 12px;border-bottom:1px solid #1e2535;vertical-align:top}
tr:hover td{background:#1a1d27}
.compra{color:#22c55e;font-weight:700}
.venda{color:#ef4444;font-weight:700}
.ticker{color:#7c3aed;font-weight:700;font-size:12px;background:#1e1040;padding:2px 6px;border-radius:4px}
.pct{font-family:monospace;font-size:12px}
.link{color:#60a5fa;text-decoration:none;font-size:11px}
.link:hover{text-decoration:underline}
.intent-ok{color:#22c55e}
.intent-warn{color:#f59e0b}
.intent-null{color:#64748b}
</style>
</head>
<body>
<header>
  <a href="/">← CVM Monitor</a>
  <span>Aquisições & Alienações · ${count} registros</span>
</header>
<div class="container">
<h2>📊 Participações Acionárias Relevantes — CVM Res. 44/21</h2>
<table>
<thead>
<tr>
  <th>Data</th>
  <th>Empresa</th>
  <th>Investidor</th>
  <th>Op</th>
  <th>Classe</th>
  <th>Antes → Depois</th>
  <th>Delta</th>
  <th>Intenção</th>
  <th>PDF</th>
</tr>
</thead>
<tbody>
${rows.map(r => {
  const op = r.operacao === "COMPRA" ? `<span class="compra">▲ COMPRA</span>` : r.operacao === "VENDA" ? `<span class="venda">▼ VENDA</span>` : r.operacao || "—";
  const delta = r.delta_pct != null ? (r.delta_pct > 0 ? `+${r.delta_pct.toFixed(2)}%` : `${r.delta_pct.toFixed(2)}%`) : "—";
  const intent = r.intencao === "✅" ? `<span class="intent-ok">✅</span>` : r.intencao === "⚠️" ? `<span class="intent-warn">⚠️</span>` : `<span class="intent-null">⚪</span>`;
  const ticker = r.ticker ? `<span class="ticker">${r.ticker}</span> ` : "";
  return `<tr>
    <td>${(r.data_entrega||"").substring(0,10)}</td>
    <td>${ticker}${r.empresa_nome||"—"}</td>
    <td>${r.investidor_nome||"—"}<br><small style="color:#64748b">${r.investidor_cnpj||""}</small></td>
    <td>${op}</td>
    <td>${r.classe_acao||"—"}</td>
    <td class="pct">${r.pct_antes_total??r.pct_antes_on??""} → ${r.pct_depois_total??r.pct_depois_on??""}</td>
    <td class="pct" style="color:${r.delta_pct>0?"#22c55e":r.delta_pct<0?"#ef4444":"#94a3b8"}">${delta}</td>
    <td>${intent}</td>
    <td>${r.link_pdf?`<a class="link" href="${r.link_pdf}" target="_blank">PDF</a>`:"—"}</td>
  </tr>`;
}).join("")}
</tbody>
</table>
</div>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=60" } });
}
