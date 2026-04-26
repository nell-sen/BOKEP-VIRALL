# Panduan Deployment ke Vercel

Project ini siap di-deploy ke Vercel. Ikuti langkah-langkah di bawah ini:

### Langkah 1: Persiapan Project
Saya telah menambahkan file `vercel.json` untuk memastikan routing Single Page Application (SPA) berjalan dengan lancar di Vercel.

### Langkah 2: Hubungkan ke GitHub
Vercel paling mudah digunakan jika project Anda ada di GitHub.
1. Download project ini (gunakan menu **Settings > Export to ZIP** di AI Studio).
2. Buat repository baru di GitHub Anda.
3. Upload file dari ZIP tadi ke repository GitHub tersebut.

### Langkah 3: Deploy di Vercel
1. Masuk ke [Vercel](https://vercel.com/).
2. Klik **"Add New"** > **"Project"**.
3. Import repository yang baru saja Anda buat.
4. Pada bagian **"Framework Preset"**, pilih **Vite**.
5. Klik **Deploy**.

### Langkah 4: Tambahkan Domain di Firebase (Penting!)
Agar fitur login dan database Firebase berjalan di domain Vercel Anda:
1. Masuk ke [Firebase Console](https://console.firebase.google.com/).
2. Pilih project Anda.
3. Pergi ke **Authentication** > **Settings** > **Authorized Domains**.
4. Tambahkan domain `.vercel.app` yang diberikan oleh Vercel ke daftar whitelist.

---
**Catatan:** Pastikan URL Backend tetap terkonfigurasi dengan benar di Admin Panel setelah Anda pindah ke domain baru.
