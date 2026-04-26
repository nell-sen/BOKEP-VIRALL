# STREAM — Video App

Static HTML + JavaScript vanilla. Upload video ke Catbox (via Vercel serverless proxy untuk mengatasi CORS), simpan metadata di Firebase Firestore.

## Struktur

```
public/
  index.html      ← Homepage (hero + Your Uploads + infinite scroll)
  upload.html     ← Halaman upload
  watch.html      ← Halaman watch (real video player)
  js/
    firebase.js   ← Firebase init (CDN modular SDK)
    app.js        ← Logic homepage
    upload.js     ← Logic upload + thumbnail + progress
    watch.js      ← Logic player
api/
  upload.js       ← Vercel serverless function (proxy ke Catbox)
vercel.json
package.json
```

## Deploy ke Vercel (3 langkah)

1. **Push ke GitHub** lalu import repo di https://vercel.com/new — atau gunakan Vercel CLI:
   ```bash
   npm i -g vercel
   vercel
   ```
2. Framework Preset: **Other**. Build command & output directory: **kosongkan** (auto).
3. Klik **Deploy**. Selesai.

URL hasil: `https://<nama-project>.vercel.app`

## Setup Firebase Firestore

1. Buka https://console.firebase.google.com/project/code-chat-219c7/firestore
2. Buat database (mode production).
3. Tab **Rules** → paste:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /videos/{doc} {
         allow read, write: if true;
       }
     }
   }
   ```

   ⚠️ Public read/write — OK untuk demo, **tidak aman** untuk produksi.

4. Klik **Publish**.

Tidak perlu buat collection manual — `videos` akan otomatis dibuat saat upload pertama.

## Cara test lokal

Untuk test serverless function `/api/upload` Anda butuh Vercel CLI:

```bash
npm i -g vercel
vercel dev
```

Lalu buka http://localhost:3000

> Membuka `public/index.html` langsung di browser TIDAK akan bekerja karena upload butuh `/api/upload` (serverless function).

## Limit & catatan

- **Max file size**: 200MB (limit Catbox & Vercel serverless body).
- **Max upload duration**: 5 menit (`maxDuration: 300` di `vercel.json`).
- **Catbox CORS**: tidak support CORS dari browser, jadi kita pakai proxy `/api/upload`.
- **Format**: MP4, WEBM, MOV.

## Fitur

✅ Upload realtime progress (XHR)  
✅ Auto thumbnail generator (canvas, fallback detik 1/2/3)  
✅ Validasi file (size + format)  
✅ State management via localStorage (resume on refresh, retry on error)  
✅ Infinite scroll (Firestore startAfter, limit 6)  
✅ Lazy load thumbnail (IntersectionObserver)  
✅ Smooth fade-in animation  
✅ Real video player (play/pause, seek drag, ±10s, volume, fullscreen, keyboard)  
✅ Error handling lengkap dengan retry  
✅ Responsive mobile-first
