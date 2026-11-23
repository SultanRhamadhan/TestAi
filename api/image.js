// Pembuat gambar (OPSIONAL). Aktif hanya jika IMAGE_MODEL diisi di Environment Variables.
// Memakai endpoint standar OpenAI: POST {BASE_URL}/images/generations
// Catatan: dokumentasi BankAI belum menyebut endpoint ini, jadi pastikan BankAI mendukungnya.
const BASE_URL = process.env.BANKAI_BASE_URL || "https://bankai.web.id/api";
const IMAGE_MODEL = process.env.IMAGE_MODEL || "";
const SIZES = ["512x512", "1024x1024", "1024x1792", "1792x1024"];

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ enabled: Boolean(IMAGE_MODEL && process.env.BANKAI_API_KEY), sizes: SIZES });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Metode tidak didukung." });
  }
  if (!IMAGE_MODEL || !process.env.BANKAI_API_KEY) {
    return res.status(501).json({ error: "Fitur gambar belum aktif. Isi IMAGE_MODEL di Vercel." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const prompt = body && typeof body.prompt === "string" ? body.prompt.trim().slice(0, 1000) : "";
  const size = SIZES.includes(body && body.size) ? body.size : "1024x1024";
  if (!prompt) return res.status(400).json({ error: "Deskripsi gambar kosong." });

  try {
    const upstream = await fetch(`${BASE_URL}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.BANKAI_API_KEY}`,
      },
      body: JSON.stringify({ model: IMAGE_MODEL, prompt, size, n: 1 }),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const msg = (data && data.error && (data.error.message || data.error)) || "BankAI menolak permintaan gambar.";
      return res.status(upstream.status).json({ error: String(msg) });
    }
    const item = data.data && data.data[0];
    if (!item) return res.status(502).json({ error: "BankAI tidak mengembalikan gambar." });
    return res.status(200).json({ url: item.url || null, b64: item.b64_json || null });
  } catch (err) {
    return res.status(502).json({ error: "Tidak bisa terhubung ke BankAI." });
  }
};
