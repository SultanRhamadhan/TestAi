// Cek model secara realtime: mengirim permintaan sangat kecil (1 token) ke tiap model
// untuk memastikan model itu benar-benar bisa dipakai saat ini.
const { apiKey, isKeyError, errMsg } = require("../lib/bankai.js");

const BASE_URL = process.env.BANKAI_BASE_URL || "https://bankai.web.id/api";
const MAX_IDS = 6;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Gunakan metode POST." });
  }
  const key = apiKey(req);
  if (!key) {
    return res.status(500).json({ error: "BANKAI_API_KEY belum diatur di Vercel." });
  }
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const ids = [...new Set(Array.isArray(body && body.models) ? body.models : [])]
    .filter((x) => typeof x === "string" && /^[\w.\-:\/]{1,80}$/.test(x))
    .slice(0, MAX_IDS);
  if (!ids.length) return res.status(400).json({ error: "Tidak ada model yang valid." });

  const results = {};
  await Promise.all(ids.map(async (id) => {
    const t0 = Date.now();
    try {
      const r = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: id, max_tokens: 1, messages: [{ role: "user", content: "hi" }] }),
        signal: AbortSignal.timeout(15000),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) results[id] = { ok: true, ms: Date.now() - t0 };
      else {
        const msg = errMsg(d);
        results[id] = { ok: false, status: r.status, ms: Date.now() - t0, keyIssue: isKeyError(r.status, msg), error: msg.slice(0, 160) };
      }
    } catch (e) {
      results[id] = { ok: false, error: e && e.name === "TimeoutError" ? "timeout (>15 detik)" : "tidak terhubung" };
    }
  }));
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ results });
};
