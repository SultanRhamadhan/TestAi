// Serverless function Vercel: API key BankAI disimpan di server (Environment Variable).
const BASE_URL = process.env.BANKAI_BASE_URL || "https://bankai.web.id/api";
const MODEL = process.env.BANKAI_MODEL || "auto-FREE";
const SYSTEM_PROMPT =
  process.env.SYSTEM_PROMPT ||
  "Kamu adalah asisten AI yang ramah. Jawab dalam bahasa Indonesia kecuali diminta lain.";

const MAX_MESSAGES = 20;
const MAX_CHARS = 20000;       // jawaban AI di riwayat (cukup untuk file buatan AI)
const MAX_USER_CHARS = 150000; // pesan pengguna (termasuk isi file yang sudah diubah jadi teks)
const MAX_IMAGES = 5;
const MAX_IMAGE_B64 = 1500000; // ~1,1 MB per gambar

// Petunjuk pembuatan file (diproses di browser menjadi tombol unduh)
const FILE_PROMPT = [
  "Kamu bisa membuat file untuk diunduh pengguna (Word, PDF, ZIP, teks, kode).",
  "Jika pengguna meminta file, tulis isi file dengan format PERSIS seperti ini:",
  "[[FILE: nama-file.ext]]",
  "isi file",
  "[[/FILE]]",
  "Aturan umum: (1) Ekstensi yang boleh: docx, pdf, txt, md, csv, json, html, css, js, py, java, php, sql, xml, yml dan sejenisnya. (2) Untuk ZIP, buat beberapa blok [[FILE: ...]] (boleh berfolder, mis. proyek/index.html); sistem otomatis membundelnya menjadi ZIP. (3) Jangan membuat blok FILE kalau pengguna tidak meminta file. (4) Tulis penjelasan singkat di luar blok. (5) Kamu tidak bisa membuat xlsx, pptx, atau file biner lain.",
  "Aturan khusus .docx dan .pdf: tulis isinya dengan Markdown yang rapi. Yang didukung: baris pertama '# Judul Dokumen', '## Bab', '### Subbab', paragraf dipisah satu baris kosong, daftar '- poin' (sub-poin diberi indentasi 2 spasi, maksimal 3 tingkat), daftar bernomor '1. langkah', tabel dengan format '| Kolom A | Kolom B |' diikuti baris '|---|---|' (maksimal 6 kolom, isi sel singkat), kutipan '> teks', blok kode ``` ... ```, garis pemisah '---', **tebal**, *miring*, dan `kode`. Jangan memakai emoji, HTML, atau tabel tanpa baris pemisah. Susun dokumen secara terstruktur: judul, pendahuluan singkat, isi per bab, lalu kesimpulan. Jangan menumpuk beberapa tingkat penekanan sekaligus dan jangan memberi baris kosong lebih dari satu.",
  "Untuk file selain .docx dan .pdf, jangan memakai ``` di dalam blok FILE.",
].join("\n");

// Petunjuk gambar di dokumen (hanya dikirim jika pengaturan "gambar di dokumen" aktif)
const IMG_PROMPT = [
  "Gambar di dokumen .docx dan .pdf: sisipkan gambar dengan satu baris tersendiri, dengan salah satu bentuk ini:",
  "![keterangan singkat](cari:kata kunci) untuk mencari foto di internet (Wikimedia Commons). Pakai kata kunci bahasa Inggris yang spesifik dan sederhana, mis. 'Borobudur temple'.",
  "![keterangan singkat](lampiran:N) untuk gambar yang diunggah pengguna. N adalah nomor pada catatan 'Gambar terlampir' di pesan pengguna.",
  "![keterangan singkat](https://alamat-gambar) hanya jika pengguna sendiri memberikan URL gambar langsung. Jangan pernah mengarang URL.",
  "Maksimal 6 gambar per dokumen. Keterangan dalam Bahasa Indonesia. Sumber dan lisensi foto internet dicantumkan otomatis oleh sistem, jadi jangan menulisnya sendiri.",
].join("\n");

// Peran AI yang dipilih pengguna
const PERSONAS = {
  umum: "",
  tutor: "Peran: tutor yang sabar. Jelaskan langkah demi langkah dengan bahasa sederhana, beri contoh, dan cek pemahaman di akhir.",
  coder: "Peran: programmer senior. Beri solusi kode yang rapi, jelaskan alasannya secara singkat, dan sebutkan kasus tepi (edge case) yang perlu diperhatikan.",
  penulis: "Peran: penulis profesional. Tulis dengan gaya jelas dan hidup sesuai tujuan pembaca, dan tawarkan revisi nada bila perlu.",
  penerjemah: "Peran: penerjemah. Terjemahkan secara akurat dan natural, jaga nada asli, dan beri catatan bila ada frasa yang ambigu.",
  bisnis: "Peran: konsultan bisnis. Beri analisis terstruktur, sertakan angka bila memungkinkan, risiko, dan langkah tindak lanjut.",
  kuliah: "Peran: pembimbing tugas kuliah. Bantu pengguna memahami materi dan menyusun tugasnya sendiri (kerangka, perbaikan, saran referensi). Dorong pemahaman dan orisinalitas, jangan hanya menyerahkan jawaban jadi.",
};

// Gaya jawaban yang dipilih pengguna
const MODES = {
  biasa: { prompt: "", params: {} },
  cepat: {
    prompt: "Gaya jawaban: CEPAT. Jawab sangat singkat dan langsung ke inti (maksimal 3-5 kalimat), tanpa basa-basi dan tanpa pengantar panjang.",
    params: { max_tokens: 600 },
  },
  kritis: {
    prompt: "Gaya jawaban: KRITIS. Jangan sekadar setuju. Periksa asumsi, tunjukkan kelemahan, risiko, dan kemungkinan salah, bandingkan alternatif, beri alasan yang jelas, dan sebutkan bila ada ketidakpastian. Tetap sopan dan akhiri dengan kesimpulan singkat.",
    params: { temperature: 0.4 },
  },
};

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
  const mode = MODES[body && body.mode] ? body.mode : "biasa";
  const persona = Object.prototype.hasOwnProperty.call(PERSONAS, body && body.persona) ? body.persona : "umum";
  const custom = body && typeof body.custom === "string"
    ? body.custom.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, 600) : "";
  const withImages = !(body && body.images === false);
  const incoming = Array.isArray(body && body.messages) ? body.messages : [];

  const messages = incoming
    .filter((m) => m && ["user", "assistant"].includes(m.role))
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: cleanContent(m.content, m.role) }))
    .filter((m) => m.content);

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return res.status(400).json({ error: "Pesan tidak valid." });
  }

  // Permintaan file butuh jawaban panjang: lepas batas max_tokens mode "cepat"
  const last = messages[messages.length - 1].content;
  const lastText = typeof last === "string" ? last : last.filter((p) => p.type === "text").map((p) => p.text).join(" ");
  const params = { ...MODES[mode].params };
  if (/(word|docx|pdf|zip|file|berkas|unduh|download)/i.test(lastText.slice(0, 2000))) delete params.max_tokens;

  const wantStream = Boolean(body && body.stream);
  const system =
    SYSTEM_PROMPT + "\n" + FILE_PROMPT + (withImages ? "\n" + IMG_PROMPT : "") +
    (PERSONAS[persona] ? "\n" + PERSONAS[persona] : "") +
    (custom ? "\nPreferensi dari pengguna (ikuti selama masuk akal): " + custom : "") +
    (MODES[mode].prompt ? "\n" + MODES[mode].prompt : "") +
    (name ? `\nNama pengguna: ${name}. Sapa dengan namanya sesekali, jangan berlebihan.` : "");

  try {
    const upstream = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.BANKAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: wanted,
        ...params,
        ...(wantStream ? { stream: true } : {}),
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });

    const ctype = upstream.headers.get("content-type") || "";

    // Mode realtime: teruskan potongan jawaban begitu tiba (Server-Sent Events)
    if (wantStream && upstream.ok && ctype.includes("text/event-stream") && upstream.body) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      });
      const reader = upstream.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, i).trim();
            buf = buf.slice(i + 1);
            if (!line.startsWith("data:")) continue;
            const d = line.slice(5).trim();
            if (!d || d === "[DONE]") continue;
            try {
              const j = JSON.parse(d);
              const t = j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content;
              if (t) res.write(`data: ${JSON.stringify({ t })}\n\n`);
            } catch { /* abaikan potongan yang bukan JSON */ }
          }
        }
        res.write("data: [DONE]\n\n");
      } catch (e) {
        res.write(`data: ${JSON.stringify({ error: "Koneksi ke BankAI terputus di tengah jawaban." })}\n\n`);
      }
      return res.end();
    }

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
    if (res.headersSent) return res.end();
    return res.status(502).json({ error: "Tidak bisa terhubung ke BankAI." });
  }
};
