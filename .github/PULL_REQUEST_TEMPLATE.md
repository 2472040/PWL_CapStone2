## 🔀 Pull Request Template

### Deskripsi Perubahan

Jelaskan secara singkat apa yang dilakukan oleh PR ini, latar belakang masalah yang diselesaikan, dan dampak perubahan pada sistem.

### Jenis Perubahan (Tandai opsi yang sesuai)

- [ ] 🚀 Fitur Baru (`feat`)
- [ ] 🐛 Perbaikan Bug (`fix`)
- [ ] 📝 Dokumentasi (`docs`)
- [ ] 🎨 Perubahan Style/Tampilan (`style`)
- [ ] ⚙️ Pemeliharaan/Refactor (`refactor`)
- [ ] 🧪 Penulisan Unit Test (`test`)

### Hubungan Isu/Tiket (Jika ada)

Sebutkan nomor isu yang ditutup atau diselesaikan oleh PR ini (contoh: Closes #123).

### Langkah Pengujian & Verifikasi

Jelaskan bagaimana reviewer dapat menguji perubahan ini:

1. Jalankan perintah `npm run ...`
2. Buka menu dashboard ...
3. Pastikan hasil output berupa ...

### 📋 Daftar Cek Keamanan & Kualitas (Wajib Diisi)

- [ ] Kode telah diuji secara lokal dan semua pengujian berstatus **PASS** (`npm run security-test`).
- [ ] Pesan commit mematuhi pedoman **Conventional Commits**.
- [ ] Tidak ada berkas rahasia (`.env`, kunci enkripsi privat) yang tidak sengaja terdorong (_pushed_) ke repositori.
- [ ] Skema database baru (jika ada) telah dilengkapi dengan migration/seeder yang sesuai.
- [ ] Tidak ada _linter warnings_ baru di sisi frontend maupun backend.
