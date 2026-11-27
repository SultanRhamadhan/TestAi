// Daftar model BankAI (gratis / berbayar / kosong), dipakai bersama oleh beberapa fungsi API.
// Sumber: https://bankai.web.id/models. Perbarui di sini jika ada perubahan.
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

module.exports = { FREE, PAID, EMPTY };
