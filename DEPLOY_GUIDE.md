# Panduan Deploy & Setup

## 1. Firebase Setup
1. Buka [Firebase Console](https://console.firebase.google.com/).
2. Buat project baru (atau gunakan yang sudah ada).
3. Aktifkan **Firestore Database**.
4. Di bagian **Firestore Rules**, ganti dengan:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /videos/{videoId} {
      allow read: if true;
      allow create: if request.resource.data.title is string 
                   && request.resource.data.url is string;
    }
  }
}
```
5. Tambahkan Web App ke Firebase project Anda untuk mendapatkan config jika ingin mengganti config yang sudah ada di `src/services/firebase.ts`.

## 2. Running Locally
```bash
npm install
npm run dev
```

## 3. Deploy ke Vercel (Front-end)
1. Push project ini ke GitHub.
2. Login ke [Vercel](https://vercel.com/) dan hubungkan dengan GitHub.
3. Import project ini.
4. (Opsional) Tambahkan environment variables jika Anda memindahkan config Firebase ke `.env.local`.
5. Klik **Deploy**.

## 4. Backend (Termux)
Ikuti panduan di `BACKEND_README.md`.
**PENTING!** Pastikan Anda mengupdate `BACKEND_URL` di `src/services/uploadService.ts` dengan URL tunnel Anda agar fitur upload berfungsi.
