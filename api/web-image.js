// Mengambil gambar dari internet untuk disisipkan ke dokumen atau dilampirkan ke chat.
//  - { q }            : cari di Wikimedia Commons (gambar berlisensi terbuka), unduh yang terbaik
//  - { q, list:true } : hanya daftar kandidat (untuk dipilih pengguna)
//  - { url, credit? } : unduh gambar dari URL langsung (http/https saja)
// Browser tidak boleh mengambil gambar lintas-situs secara langsung (CORS), jadi server yang mengunduh.
const dns = require("dns").promises;
const net = require("net");

const UA = "TanyaAI/1.0 (aplikasi chat pribadi; pengambil gambar)";
const MAX_BYTES = 2800000; // base64 harus tetap di bawah batas respons Vercel (~4,5 MB)
const OK_MIME = /^image\/(jpeg|png|webp|gif)$/;

function privateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  const v = ip.toLowerCase();
  if (v === "::" || v === "::1") return true;
  if (v.startsWith("::ffff:")) return privateIp(v.slice(7));
  return /^f[cd]/.test(v) || /^fe[89ab]/.test(v);
}

async function assertPublicHost(u) {
  if (!/^https?:$/.test(u.protocol)) throw new Error("Hanya URL http/https yang didukung.");
  if (u.port && !["80", "443"].includes(u.port)) throw new Error("Port tidak diizinkan.");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Alamat tidak diizinkan.");
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => privateIp(a.address))) throw new Error("Alamat tidak diizinkan.");
}

// fetch dengan pemeriksaan tiap pengalihan (redirect) agar tidak bisa dipakai menyerang jaringan internal
async function safeFetch(url, hops = 0) {
  const u = new URL(url);
  await assertPublicHost(u);
  const r = await fetch(u, {
    redirect: "manual",
    headers: { "User-Agent": UA, Accept: "image/*" },
    signal: AbortSignal.timeout(10000),
  });
  if (r.status >= 300 && r.status < 400 && r.headers.get("location")) {
    if (hops >= 3) throw new Error("Terlalu banyak pengalihan.");
    return safeFetch(new URL(r.headers.get("location"), u).toString(), hops + 1);
  }
  return r;
}

async function downloadImage(url) {
  const r = await safeFetch(url);
  if (!r.ok) throw new Error("Server gambar menjawab " + r.status + ".");
  const mime = (r.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!OK_MIME.test(mime)) throw new Error("Bukan gambar yang didukung (" + (mime || "tidak diketahui") + ").");
  if (Number(r.headers.get("content-length") || 0) > MAX_BYTES) throw new Error("Gambar terlalu besar (maks ±2,8 MB).");
  const reader = r.body.getReader();
  const chunks = [];
  let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.length;
    if (n > MAX_BYTES) {
      try { await reader.cancel(); } catch { /* abaikan */ }
      throw new Error("Gambar terlalu besar (maks ±2,8 MB).");
    }
    chunks.push(value);
  }
  return { mime, b64: Buffer.concat(chunks).toString("base64") };
}

const strip = (s) => String(s || "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, " ").trim().slice(0, 90);

async function commonsSearch(q, width) {
  const api = new URL("https://commons.wikimedia.org/w/api.php");
  const params = {
    action: "query", format: "json", generator: "search", gsrsearch: "filetype:bitmap " + q,
    gsrnamespace: "6", gsrlimit: "12", prop: "imageinfo", iiprop: "url|mime|size|extmetadata", iiurlwidth: String(width),
  };
  Object.entries(params).forEach(([k, v]) => api.searchParams.set(k, v));
  const r = await fetch(api, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error("Pencarian gambar gagal (" + r.status + ").");
  const d = await r.json();
  return Object.values((d.query && d.query.pages) || {})
    .sort((a, b) => (a.index || 0) - (b.index || 0))
    .map((p) => {
      const i = p.imageinfo && p.imageinfo[0];
      if (!i) return null;
      const m = i.extmetadata || {};
      const artist = strip(m.Artist && m.Artist.value);
      const license = strip(m.LicenseShortName && m.LicenseShortName.value);
      return {
        title: strip(String(p.title || "").replace(/^File:/, "").replace(/\.[a-z0-9]+$/i, "")),
        thumb: i.thumburl || i.url,
        mime: i.mime,
        w: i.thumbwidth || i.width || 0,
        h: i.thumbheight || i.height || 0,
        credit: "Sumber: Wikimedia Commons" + (artist ? " / " + artist : "") + (license ? " (" + license + ")" : ""),
        page: i.descriptionurl || "",
      };
    })
    .filter((x) => x && x.thumb && OK_MIME.test(x.mime || "") && x.w >= 300);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Gunakan metode POST." });
  }
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};
  const q = typeof body.q === "string" ? body.q.replace(/[\u0000-\u001F]/g, " ").trim().slice(0, 120) : "";
  const url = typeof body.url === "string" ? body.url.trim().slice(0, 2000) : "";
  const given = typeof body.credit === "string" ? body.credit.replace(/[\u0000-\u001F]/g, " ").trim().slice(0, 160) : "";
  res.setHeader("Cache-Control", "no-store");

  try {
    if (q) {
      if (body.list) {
        const results = (await commonsSearch(q, 640)).slice(0, 8);
        return res.status(200).json({ results });
      }
      const found = await commonsSearch(q, 1000);
      for (const c of found.slice(0, 4)) {
        try {
          const img = await downloadImage(c.thumb);
          return res.status(200).json({ ...img, credit: c.credit, title: c.title, source: c.page });
        } catch { /* coba kandidat berikutnya */ }
      }
      return res.status(404).json({ error: "Tidak ada gambar yang cocok untuk “" + q + "”." });
    }
    if (url) {
      const img = await downloadImage(url);
      return res.status(200).json({ ...img, credit: given });
    }
    return res.status(400).json({ error: "Isi q (kata kunci) atau url." });
  } catch (e) {
    const known = /Alamat|http|Port|besar|pengalihan|menjawab|Bukan gambar|Pencarian/.test(e.message || "");
    return res.status(known ? 400 : 502).json({ error: known ? e.message : "Tidak bisa mengambil gambar dari internet." });
  }
};
module.exports.privateIp = privateIp;
