// Serverless function Vercel: API key BankAI disimpan di server (Environment Variable),
// jadi tidak pernah terlihat di browser.
const BASE_URL = process.env.BANKAI_BASE_URL || "https://bankai.web.id/api";
const MODEL = process.env.BANKAI_MODEL || "auto";
const SYSTEM_PROMPT =
  process.env.SYSTEM_PROMPT ||
  "Kamu adalah asisten AI yang ramah. Jawab dalam bahasa Indonesia kecuali diminta lain.";

const MAX_MESSAGES = 20;
const MAX_CHARS = 4000;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Gunakan metode POST." });
  }
  if (!process.env.BANKAI_API_KEY) {
    return res.status(500).json({ error: "BANKAI_API_KEY belum diatur di Vercel." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const wanted = body && typeof body.model === "string" && /^[\w.\-:\/]{1,80}$/.test(body.model)
    ? body.model : MODEL;
  const name = body && typeof body.name === "string"
    ? body.name.replace(/[^\p{L}\p{N} .'-]/gu, "").trim().slice(0, 40) : "";
  const incoming = Array.isArray(body && body.messages) ? body.messages : [];

  // Validasi & batasi input supaya token tidak terbuang percuma
  const messages = incoming
    .filter((m) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return res.status(400).json({ error: "Pesan tidak valid." });
  }

  try {
    const upstream = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.BANKAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: wanted,
        messages: [{ role: "system", content: SYSTEM_PROMPT + (name ? `\nNama pengguna: ${name}. Sapa dengan namanya sesekali, jangan berlebihan.` : "") }, ...messages],
      }),
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const msg = (data && data.error && (data.error.message || data.error)) || "Permintaan ke BankAI gagal.";
      return res.status(upstream.status).json({ error: String(msg) });
    }
    const reply = data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : "";
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(502).json({ error: "Tidak bisa terhubung ke BankAI." });
  }
};
