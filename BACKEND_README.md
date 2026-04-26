# StreamZ Backend Setup (Node.js/Termux)

Untuk menjalankan backend upload video eksternal, ikuti langkah-langkah berikut di Termux atau lingkungan Node.js pilihan Anda:

## 1. Persiapan Folder & Project
```bash
mkdir streamz-backend && cd streamz-backend
npm init -y
npm install express multer axios form-data fluent-ffmpeg cors express-rate-limit
```

## 2. Install FFmpeg (Wajib untuk Thumbnail)
**Di Termux:**
```bash
pkg install ffmpeg
```
**Di Linux/Ubuntu:**
```bash
sudo apt update && sudo apt install ffmpeg
```

## 3. Simpan Code Backend
Buat file `server.js` dan tempelkan kode backend yang ada di request (sudah disediakan).

## 4. Jalankan Backend
```bash
node server.js
```

## 5. Expose Backend (Cloudflare Tunnel / Ngrok)
Gunakan Cloudflare Tunnel (direkomendasikan karena stabil di Termux):
```bash
cloudflared tunnel --url http://localhost:3000
```
Salin URL dari Cloudflare (misal: `https://xyz-abc-123.trycloudflare.com`) dan ganti nilai `BACKEND_URL` di file `src/services/uploadService.ts` di project Next.js Anda.

## Troubleshooting
- **File Size:** Jika ingin upload lebih dari 200MB, update `limits: { fileSize: ... }` di `server.js`.
- **CORS:** Pastikan `origin: "*"` aktif jika mengakses dari domain berbeda.
- **Port:** Default adalah 3000, pastikan tidak bentrok.
