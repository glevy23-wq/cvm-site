// warmup.js — Pré-aquece as 10 empresas mais visitadas
// Cron: a cada 5 min — mantém serverless quente, elimina cold start

const TOP_CDCVM = [
  '009512', // PETR4
  '004170', // VALE3
  '019348', // ITUB4
  '001023', // BBAS3
  '005410', // WEGE3
  '020478', // ITSA4
  '022187', // ABEV3
  '015300', // BBDC4
  '023264', // RENT3
  '024163', // B3SA3
];

export default async function handler(req, res) {
  const start = Date.now();
  
  // Pré-aquecer /empresa-data para as top 10
  const results = await Promise.allSettled(
    TOP_CDCVM.map(cd =>
      fetch(`https://cvm-monitor.vercel.app/empresa-data?cdcvm=${cd}`, {
        headers: { 'User-Agent': 'vercel-warmup/1.0' }
      }).then(r => ({ cd, status: r.status, ms: Date.now() - start }))
    )
  );
  
  const ok = results.filter(r => r.status === 'fulfilled' && r.value.status === 200).length;
  const ms = Date.now() - start;
  
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    ok,
    total: TOP_CDCVM.length,
    ms,
    ts: new Date().toISOString()
  });
}
