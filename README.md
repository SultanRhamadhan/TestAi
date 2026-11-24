# Tanya AI — BankAI + Vercel

Aplikasi chat AI sederhana. Frontend statis (`public/index.html`) dan satu serverless function (`api/chat.js`)
yang memanggil API BankAI (kompatibel OpenAI) dengan API key yang disimpan aman di Vercel.

## Struktur
```
api/models.js      # daftar model dari BankAI
api/image.js       # pembuat gambar (opsional)
api/image-edit.js  # edit gambar (opsional)
vercel.json        # batas waktu fungsi 60 detik
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

## Gaya jawaban
Tiga tombol di atas kolom ketik: **Biasa** (seimbang), **Cepat** (singkat, maks 600 token) dan **Kritis** (memeriksa asumsi, risiko, dan alternatif).

## Lampiran (tombol 📎)
- Gambar (maks 5, otomatis diperkecil), PDF, Word (.docx), ZIP, dan semua file teks/kode.
- PDF/Word/ZIP dibaca di browser lalu dikirim sebagai teks (maks 100.000 karakter per file, 130.000 per pesan).
- Batas yang tidak bisa dihilangkan: ukuran permintaan Vercel (±4,5 MB), panjang konteks model, dan saldo token.
- PDF hasil scan, .doc/.xls/.ppt lama, dan file biner tidak bisa dibaca.

## AI membuat file untuk diunduh
Minta di chat, mis. "buatkan laporan dalam file Word" atau "buatkan proyek web dalam ZIP". AI menulis isi file, lalu browser membuat tombol **Unduh**.
- Word (.docx) dan PDF: isi berupa teks berformat sederhana (judul, poin, tebal). Tanpa tabel dan gambar. PDF hanya mendukung huruf Latin (tanpa emoji atau aksara lain).
- ZIP: jika AI membuat 2 file atau lebih, muncul tombol **Unduh ZIP** (struktur folder didukung).
- Teks/kode: txt, md, csv, json, html, css, js, py, dll.
- Tidak bisa: xlsx, pptx, dan file biner lain.

## Realtime
- Jawaban muncul sambil diketik (streaming). Bisa dimatikan di ⚙ Pengaturan.
- Daftar model diambil langsung dari BankAI (`/models`); model baru otomatis muncul di grup "Baru dari BankAI". Status gratis/berbayar/kosong tetap dari daftar di `api/models.js`.
- `vercel.json` menaikkan batas waktu fungsi menjadi 60 detik.

## Tanda di daftar model
👁 bisa membaca gambar (berdasarkan jenis model) · ✏️ bisa mengedit gambar · 🎨 bisa membuat gambar. Tanda ✏️ dan 🎨 muncul untuk model yang kamu isi di `IMAGE_EDIT_MODEL` dan `IMAGE_MODEL`.

## Edit gambar dengan AI (opsional)
Isi `IMAGE_EDIT_MODEL` (nama model dari BankAI, pisahkan koma) lalu Redeploy. Tombol ✏️ muncul: lampirkan gambar, tulis perubahan, kirim. Memakai endpoint `POST /images/edits`; jika BankAI memakai path lain isi `IMAGE_EDIT_PATH`.

## Fitur buat gambar (opsional, nonaktif secara bawaan)
Dokumentasi BankAI hanya menyebut chat completions, jadi fitur ini belum terbukti didukung.
Kalau BankAI punya model gambar, isi `IMAGE_MODEL` di Environment Variables Vercel lalu Redeploy. Tombol 🎨 akan muncul otomatis.

## Catatan penting
- Jangan taruh API key di `index.html` atau commit file `.env`.
- Situs publik memakai saldo token-mu. Untuk dipakai umum, tambahkan login atau pembatasan per pengguna.
- Mau mengganti nama `xxx.vercel.app`: Vercel → Settings → Domains.
