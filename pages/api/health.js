// pages/api/health.js
export default function handler(req, res) {
  res.json({ ok: true, ts: Date.now() });
}
