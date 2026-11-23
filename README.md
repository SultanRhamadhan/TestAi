# Tanya AI — BankAI + Vercel

Aplikasi chat AI sederhana. Frontend statis (`public/index.html`) dan satu serverless function (`api/chat.js`)
yang memanggil API BankAI (kompatibel OpenAI) dengan API key yang disimpan aman di Vercel.

## Struktur
```
api/models.js      # daftar model dari BankAI
api/image.js       # pembuat gambar (opsional)
api/chat.js        # backend (serverless), memanggil https://bankai.web.id/api/chat/completions
public/index.html  # tampilan chat
.env.example       # contoh environment variable
```

## 1. Siapkan API key
(File `.env` sudah berisi API key dan base URL. JANGAN upload `.env` ke GitHub.)
1. Daftar/login di https://bankai.web.id/register
2. Top-up lewat QRIS, lalu salin API key dari dashboard.

## 2. Coba di komputer (opsional)
```bash
npm i -g vercel
cp .env.example .env     # isi BANKAI_API_KEY
vercel dev
```
Buka http://localhost:3000

## 3. Deploy ke vercel.app
**Lewat GitHub (disarankan)**
1. Upload folder ini ke repo GitHub baru.
2. Di https://vercel.com/new pilih repo tersebut (Framework Preset: *Other*), lalu klik Deploy.
3. Buka Settings → Environment Variables, tambahkan:
   - `BANKAI_API_KEY` = API key kamu
   - `BANKAI_MODEL` = `auto-FREE` (model bawaan; pengguna bisa memilih lewat dropdown)
   - `SYSTEM_PROMPT` = (opsional) kepribadian AI-mu
4. Klik Redeploy. Situsmu aktif di `https://nama-project.vercel.app`.

**Lewat CLI**
```bash
vercel                       # ikuti pertanyaan, buat project
vercel env add BANKAI_API_KEY
vercel --prod
```

## Fitur lampiran
- Tombol 📎: lampirkan gambar (maks 3, otomatis diperkecil) atau file teks/kode (.txt, .md, .csv, .json, .js, .py, dll, maks 2 MB).
- Gambar hanya bisa dibaca oleh model yang punya kemampuan vision (mis. `deepseek-v4-flash-vision-exp`, `nemotron-3.5-super-vl-free`). Di model lain gambar bisa menimbulkan error.
- PDF dan Word belum didukung.

## Fitur buat gambar (opsional, nonaktif secara bawaan)
Dokumentasi BankAI hanya menyebut chat completions, jadi fitur ini belum terbukti didukung.
Kalau BankAI punya model gambar, isi `IMAGE_MODEL` di Environment Variables Vercel lalu Redeploy. Tombol 🎨 akan muncul otomatis.

## Catatan penting
- Jangan taruh API key di `index.html` atau commit file `.env`.
- Situs publik memakai saldo token-mu. Untuk dipakai umum, tambahkan login atau pembatasan per pengguna.
- Mau mengganti nama `xxx.vercel.app`: Vercel → Settings → Domains.
