// Daftar model BankAI. Data dasar (gratis / berbayar / kosong) dari https://bankai.web.id/models.
// Model baru yang muncul di BankAI ditambahkan otomatis lewat GET {BASE_URL}/models.
const { apiKey, hasPersonalKey } = require("../lib/bankai.js");

const BASE_URL = process.env.BANKAI_BASE_URL || "https://bankai.web.id/api";

const { FREE, PAID, EMPTY } = require("../lib/catalog.js");

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

async function fetchLive(key) {
  if (!key) return null;
  try {
    const r = await fetch(`${BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(4000),
    });
    const d = await r.json();
    return r.ok && Array.isArray(d.data) ? d.data.map((m) => m && m.id).filter((x) => typeof x === "string") : null;
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  // Respons dengan key pribadi tidak boleh di-cache bersama pengguna lain
  res.setHeader("Cache-Control", hasPersonalKey(req) ? "no-store" : "s-maxage=60, stale-while-revalidate=300");
  const known = new Set([...FREE, ...PAID, ...EMPTY]);
  const live = await fetchLive(apiKey(req));

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
