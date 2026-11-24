// Daftar model BankAI. Data dasar (gratis / berbayar / kosong) dari https://bankai.web.id/models.
// Model baru yang muncul di BankAI ditambahkan otomatis lewat GET {BASE_URL}/models.
const BASE_URL = process.env.BANKAI_BASE_URL || "https://bankai.web.id/api";

const FREE = [
  "auto-FREE", "claude-sonnet-4-6-FREE", "claude-opus-4-6-thinking-FREE", "claude-sonnet-4.5-FREE",
  "claude-haiku-4.5-FREE", "gemini-3.8-flash-high-FREE", "gemini-3.8-flash-medium-FREE",
  "gemini-3.8-flash-low-FREE", "gpt-oss-120b-medium-FREE", "deepseek-3.2-FREE", "deepseek-v4.1-flash-free",
  "glm-5-FREE", "minimax-m2.5-FREE", "minimax-m2.1-FREE", "qwen3-coder-next-FREE", "qwen4-max-free",
  "mimo-v2.6-flash-free", "kimi-k3-mod", "big-pickle-FREE", "iceman-free", "beam-free", "flint-40b-free",
  "nemotron-3.5-super-vl-free", "nemotron-3.5-lightning-free", "hy4-flash-free", "tidepool-alpha-free",
];
const PAID = [
  "auto", "kimi-k2.7-code", "deepseek-v4-pro", "glm-5.2", "mimo-v2.5-pro", "kimi-k2.7-code-highspeed",
  "deepseek-v4-flash", "deepseek-v4-flash-0731", "deepseek-v4-flash-vision-exp", "deepseek-v4.1-flash",
  "deepseek-v4-mod", "deepseek-v4-uncensored", "deepseek-v4.1-flash-1017", "deepseek-v4.1-flash-mod",
  "deepseek-v4.1-flash-uncensored", "deepseek-v4.1-flash-1017-mod", "deepseek-v4.1-flash-1017-uncensored",
  "glm-5.2-mod", "glm-5.2-uncensored", "glm-5.3", "glm-5.3-flash", "glm-5.3-mod", "glm-5.3-uncensored",
  "glm-5.3-flash-mod", "glm-5.3-flash-uncensored", "kimi-k2.8", "mimo-v2.6-flash", "mimo-v2.6-pro",
  "gemini-4-argon",
];
const EMPTY = [
  "hy3", "kimi-k2.5", "kimi-k2.6", "hy4", "deepseek-v4-pro-0813", "glm-5.3-flashx", "glm-5.3-flashx-mod",
  "gpt-5.6", "gpt-5.6-luna", "kimi-k3", "gpt-6-luna", "claude-sonnet-5", "gpt-5.6-terra", "claude-opus-5",
  "gpt-5.6-sol", "gpt-6-sol", "claude-opus-5-5", "gpt-6-astra",
];

const list = (s) => (s || "").split(",").map((x) => x.trim()).filter(Boolean);
const EDIT = list(process.env.IMAGE_EDIT_MODEL); // model yang bisa mengedit gambar
const GEN = list(process.env.IMAGE_MODEL);       // model yang bisa membuat gambar

// 👁 = bisa MEMBACA gambar (berdasarkan jenis model, bukan hasil uji)
const isVision = (id) => /^(claude-|gemini-)/i.test(id) || /vision|-vl-|-vl$/i.test(id);
const marks = (id) => (EDIT.includes(id) ? "✏️ " : "") + (GEN.includes(id) ? "🎨 " : "") + (isVision(id) ? "👁 " : "");
const item = (id, group, available, note) => ({
  id, group, available,
  label: marks(id) + id + (note || ""),
  vision: isVision(id), edit: EDIT.includes(id), gen: GEN.includes(id),
});

async function fetchLive() {
  if (!process.env.BANKAI_API_KEY) return null;
  try {
    const r = await fetch(`${BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${process.env.BANKAI_API_KEY}` },
      signal: AbortSignal.timeout(4000),
    });
    const d = await r.json();
    return r.ok && Array.isArray(d.data) ? d.data.map((m) => m && m.id).filter((x) => typeof x === "string") : null;
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  const known = new Set([...FREE, ...PAID, ...EMPTY]);
  const live = await fetchLive();

  const fresh = [];
  for (const id of live || []) {
    if (!known.has(id) && /^[\w.\-:\/]{1,80}$/.test(id) && !fresh.some((m) => m.id === id)) {
      fresh.push(item(id, "Baru dari BankAI", true));
    }
  }
  const imageOnly = [...EDIT, ...GEN]
    .filter((id, i, a) => a.indexOf(id) === i && !known.has(id) && !fresh.some((m) => m.id === id))
    .map((id) => item(id, "Khusus menu gambar", false, " (khusus menu gambar)"));

  const models = [
    ...FREE.map((id) => item(id, "Gratis", true)),
    ...PAID.map((id) => item(id, "Pakai token", true, id === "gemini-4-argon" ? " (boros)" : "")),
    ...fresh,
    ...EMPTY.map((id) => item(id, "Stok kosong", false, " (kosong)")),
    ...imageOnly,
  ];
  res.status(200).json({ models, live: Boolean(live) });
};
