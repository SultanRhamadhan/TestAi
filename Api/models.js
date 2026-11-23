// Daftar model dari https://bankai.web.id/models (id harus persis sama).
// Format: [id, pengali token atau null jika gratis, tersedia?]
const FREE = [
  "auto-FREE", "claude-sonnet-4-6-FREE", "claude-opus-4-6-thinking-FREE", "claude-sonnet-4.5-FREE",
  "claude-haiku-4.5-FREE", "gemini-3.8-flash-high-FREE", "gemini-3.8-flash-medium-FREE",
  "gemini-3.8-flash-low-FREE", "gpt-oss-120b-medium-FREE", "deepseek-3.2-FREE", "deepseek-v4.1-flash-free",
  "glm-5-FREE", "minimax-m2.5-FREE", "minimax-m2.1-FREE", "qwen3-coder-next-FREE", "qwen4-max-free",
  "mimo-v2.6-flash-free", "kimi-k3-mod", "big-pickle-FREE", "iceman-free", "beam-free", "flint-40b-free",
  "nemotron-3.5-super-vl-free", "nemotron-3.5-lightning-free", "hy4-flash-free", "tidepool-alpha-free",
];

const PAID = [
  ["auto", 1], ["kimi-k2.7-code", 1], ["deepseek-v4-pro", 1.15], ["glm-5.2", 1.25], ["mimo-v2.5-pro", 1.4],
  ["kimi-k2.7-code-highspeed", 1.5], ["deepseek-v4-flash", 2], ["deepseek-v4-flash-0731", 2],
  ["deepseek-v4-flash-vision-exp", 2.5], ["deepseek-v4.1-flash", 2.56], ["deepseek-v4-mod", 3],
  ["deepseek-v4-uncensored", 3], ["deepseek-v4.1-flash-1017", 3], ["deepseek-v4.1-flash-mod", 3.2],
  ["deepseek-v4.1-flash-uncensored", 3.2], ["deepseek-v4.1-flash-1017-mod", 3.5],
  ["deepseek-v4.1-flash-1017-uncensored", 3.5], ["glm-5.2-mod", 3], ["glm-5.2-uncensored", 3],
  ["glm-5.3", 2], ["glm-5.3-flash", 2], ["glm-5.3-mod", 3.2], ["glm-5.3-uncensored", 3.2],
  ["glm-5.3-flash-mod", 3.5], ["glm-5.3-flash-uncensored", 3.5], ["kimi-k2.8", 2],
  ["mimo-v2.6-flash", 2], ["mimo-v2.6-pro", 2], ["gemini-4-argon", 60],
];

const EMPTY = [
  ["hy3", 1], ["kimi-k2.5", 1], ["kimi-k2.6", 1], ["hy4", 1.4], ["deepseek-v4-pro-0813", 1.8],
  ["glm-5.3-flashx", 3], ["glm-5.3-flashx-mod", 5], ["gpt-5.6", 5], ["gpt-5.6-luna", 5],
  ["kimi-k3", 6], ["gpt-6-luna", 8], ["claude-sonnet-5", 10], ["gpt-5.6-terra", 10],
  ["claude-opus-5", 20], ["gpt-5.6-sol", 25], ["gpt-6-sol", 30], ["claude-opus-5-5", 32], ["gpt-6-astra", 42],
];

const MODELS = [
  ...FREE.map((id) => ({ id, label: id, group: "Gratis", available: true })),
  ...PAID.map(([id, x]) => ({ id, label: `${id} · ${x}x`, group: "Pakai token", available: true })),
  ...EMPTY.map(([id, x]) => ({ id, label: `${id} · ${x}x (kosong)`, group: "Stok kosong", available: false })),
];

module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=300");
  res.status(200).json({ models: MODELS });
};
