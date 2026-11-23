// Serverless function Vercel: API key BankAI disimpan di server (Environment Variable).
const BASE_URL = process.env.BANKAI_BASE_URL || "https://bankai.web.id/api";
const MODEL = process.env.BANKAI_MODEL || "auto-FREE";
const SYSTEM_PROMPT =
  process.env.SYSTEM_PROMPT ||
  "Kamu adalah asisten AI yang ramah. Jawab dalam bahasa Indonesia kecuali diminta lain.";

const MAX_MESSAGES = 20;
const MAX_CHARS = 4000;        // pesan biasa / jawaban AI
const MAX_USER_CHARS = 26000;  // pesan pengguna (termasuk isi file teks)
const MAX_IMAGES = 3;
const MAX_IMAGE_B64 = 1500000; // ~1,1 MB per gambar

function cleanContent(c, role) {
  if (typeof c === "string") return c.slice(0, role === "user" ? MAX_USER_CHARS : MAX_CHARS);
  if (role === "user" && Array.isArray(c)) {
    let images = 0;
    const parts = [];
    for (const p of c) {
      if (p && p.type === "text" && typeof p.text === "string") {
        parts.push({ type: "text", text: p.text.slice(0, MAX_USER_CHARS) });
      } else if (
        p && p.type === "image_url" && p.image_url && typeof p.image_url.url === "string" &&
        /^data:image\/(png|jpe?g|webp|gif);base64,/.test(p.image_url.url) &&
        p.image_url.url.length <= MAX_IMAGE_B64 && images < MAX_IMAGES
      ) {
        images++;
        parts.push({ type: "image_url", image_url: { url: p.image_url.url } });
      }
    }
    return parts.length ? parts : null;
  }
  return null;
}

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

  const messages = incoming
    .filter((m) => m && ["user", "assistant"].includes(m.role))
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: cleanContent(m.content, m.role) }))
    .filter((m) => m.content);

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
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT + (name ? `\nNama pengguna: ${name}. Sapa dengan namanya sesekali, jangan berlebihan.` : ""),
          },
          ...messages,
        ],
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
