// Edit gambar dengan AI (OPSIONAL). Aktif jika IMAGE_EDIT_MODEL diisi di Environment Variables.
// Memakai endpoint standar OpenAI: POST {BASE_URL}/images/edits (multipart).
// Catatan: dokumentasi BankAI belum menyebut endpoint ini. Jika BankAI memakai path lain,
// ubah lewat IMAGE_EDIT_PATH.
const BASE_URL = process.env.BANKAI_BASE_URL || "https://bankai.web.id/api";
const PATH = process.env.IMAGE_EDIT_PATH || "/images/edits";
const MODELS = (process.env.IMAGE_EDIT_MODEL || "").split(",").map((x) => x.trim()).filter(Boolean);
const SIZES = ["512x512", "1024x1024", "1024x1792", "1792x1024"];
const MAX_B64 = 3000000;

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ enabled: Boolean(MODELS.length && process.env.BANKAI_API_KEY), models: MODELS });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Metode tidak didukung." });
  }
  if (!MODELS.length || !process.env.BANKAI_API_KEY) {
    return res.status(501).json({ error: "Fitur edit gambar belum aktif. Isi IMAGE_EDIT_MODEL di Vercel." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const prompt = body && typeof body.prompt === "string" ? body.prompt.trim().slice(0, 1000) : "";
  const size = SIZES.includes(body && body.size) ? body.size : "1024x1024";
  const model = MODELS.includes(body && body.model) ? body.model : MODELS[0];
  const m = body && typeof body.image === "string" ? body.image.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/) : null;
  if (!prompt) return res.status(400).json({ error: "Instruksi edit kosong." });
  if (!m || m[2].length > MAX_B64) return res.status(400).json({ error: "Gambar tidak valid atau terlalu besar." });

  try {
    const form = new FormData();
    form.append("model", model);
    form.append("prompt", prompt);
    form.append("size", size);
    form.append("n", "1");
    const ext = m[1] === "image/png" ? "png" : m[1] === "image/webp" ? "webp" : "jpg";
    form.append("image", new Blob([Buffer.from(m[2], "base64")], { type: m[1] }), `image.${ext}`);

    const upstream = await fetch(`${BASE_URL}${PATH}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.BANKAI_API_KEY}` },
      body: form,
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const msg = (data && data.error && (data.error.message || data.error)) || "BankAI menolak permintaan edit gambar.";
      return res.status(upstream.status).json({ error: String(msg) });
    }
    const out = data.data && data.data[0];
    if (!out) return res.status(502).json({ error: "BankAI tidak mengembalikan gambar." });
    return res.status(200).json({ url: out.url || null, b64: out.b64_json || null });
  } catch (err) {
    return res.status(502).json({ error: "Tidak bisa terhubung ke BankAI." });
  }
};
