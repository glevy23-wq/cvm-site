// ping.js — endpoint de health check instantâneo, zero queries
module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    status: 'ok',
    ts: new Date().toISOString(),
    service: 'cvm-monitor'
  });
}
