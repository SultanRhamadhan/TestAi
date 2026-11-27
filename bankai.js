// Bantuan bersama untuk fungsi API: pemilihan API key dan pengenalan error "key tidak berlaku".
const { FREE } = require("./catalog.js");

const KEY_RE = /^sk-bankai-[A-Za-z0-9]{16,128}$/;

// Key pribadi dari browser (header X-Bankai-Key) didahulukan; jika tidak ada, pakai key di Vercel.
function apiKey(req) {
  const h = req && req.headers ? String(req.headers["x-bankai-key"] || "").trim() : "";
  return KEY_RE.test(h) ? h : process.env.BANKAI_API_KEY || "";
}
const hasPersonalKey = (req) => Boolean(req && req.headers && KEY_RE.test(String(req.headers["x-bankai-key"] || "").trim()));

const isFreeModel = (id) => /free$/i.test(id || "") || FREE.includes(id);

const KEY_BAD_RE = /(tidak berlaku|dicabut|di-?regenerate|tersinkron|invalid api[ -]?key|incorrect api[ -]?key|api[ -]?key.{0,30}(invalid|revoked|expired|tidak valid)|unauthorized)/i;
function isKeyError(status, msg) {
  return status === 401 || status === 403 || KEY_BAD_RE.test(String(msg || ""));
}

const KEY_HELP =
  "API key BankAI tidak berlaku (sudah dicabut atau di-regenerate). Model berbayar belum bisa dipakai, model gratis (-FREE) tetap bisa. " +
  "Perbaiki: buka bankai.web.id dan login sekali, salin key terbaru, lalu tempel di Pengaturan → AI → API key BankAI, " +
  "atau ganti BANKAI_API_KEY di Vercel lalu Redeploy.";

const errMsg = (d) => String((d && d.error && (d.error.message || d.error)) || (d && d.message) || "Permintaan ke BankAI gagal.");

module.exports = { apiKey, hasPersonalKey, isFreeModel, isKeyError, KEY_HELP, errMsg, KEY_RE };
