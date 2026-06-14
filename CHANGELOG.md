# 📜 Catatan Rilis LokaLab Suite (Changelog)

Semua pembaruan penting pada proyek LokaLab Suite akan dicatat di dokumen ini. Format dokumen ini mengacu pada [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) dan mematuhi aturan [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.0.0] - 2026-06-14

Versi rilis ini berfokus pada penguatan arsitektur keamanan, peningkatan kriptografi, integrasi validasi data backend, serta pembersihan antarmuka dashboard pengguna secara menyeluruh.

### Added
- **Optimalisasi Performa Frontend (Code Splitting)**: Penerapan pemisahan kode dinamis (`React.lazy` & `Suspense`) pada seluruh modal dan laci (*drawers*) untuk memotong ukuran bundel awal dari 3.3 MB menjadi < 500 KB demi pemuatan aplikasi yang instan.
- **Penyegaran Token Otomatis (Refresh Token Rotation)**: Pengamanan sesi login bertipe HttpOnly cookie menggunakan token ganda (Access & Refresh Token) dengan deteksi penggunaan ulang otomatis (*Reuse Detection*).
- **Arsitektur Penanganan Error Terpusat**: Middleware penanganan kesalahan global (`globalErrorHandler`) dan kelas exception kustom (`AppError`, dll) untuk merapikan kode kontroler backend.
- **Enkripsi Cadangan AES-256-GCM**: Mengganti enkripsi CBC lama dengan Galois/Counter Mode (GCM) yang menyediakan verifikasi integritas data bawaan via *Authentication Tag*.
- **Derivasi Kunci scrypt**: Kunci enkripsi cadangan didefinisikan menggunakan KDF `scrypt` dengan *salt* dinamis 16-byte acak untuk ketahanan penuh terhadap serangan dekripsi offline.
- **Audit Trail Anti-Tamper**: Penambahan middleware hash chaining berbasis HMAC-SHA256 untuk memproteksi tabel `audit_logs` dari manipulasi basis data.
- **Validasi Integritas Kriptografis**: Tombol verifikasi rantai audit di halaman Sys Admin untuk mendeteksi manipulasi log secara otomatis.
- **Pembersihan Blacklist Token Otomatis**: Rutin Express yang otomatis dijalankan saat server naik dan berkala setiap 6 jam untuk menghapus token usang dari database.
- **Form Inventaris & Pemeliharaan Baru**: Menambahkan berkas `NewInventoryForm.jsx` dan menyempurnakan `BHP.jsx` & `MaintenanceForm.jsx` untuk kontrol penuh atas log pemeliharaan fisik.
- **Dokumentasi MIT License**: Lisensi legal ditambahkan secara resmi ke proyek.

### Changed
- **Pemisahan Kunci Rahasia**: Memisahkan `.env` key menjadi tiga bagian independen (`JWT_SECRET`, `BACKUP_ENCRYPTION_SECRET`, `AUDIT_LOG_SECRET`).
- **Peningkatan RBAC**: Penolakan sesi global secara otomatis via peningkatan `token_version` di database jika terdapat penggantian kata sandi atau peran oleh admin.
- **Transisi Landing Page**: Penguncian tinggi *header* dan optimasi animasi *reveal* tombol sign-in menggunakan `IntersectionObserver`.

### Fixed
- **Kasus Khusus macOS/Windows Git Fetch**: Menyelesaikan konflik penamaan branch case-sensitive (`Fran`/`fran`) pada sistem file Windows.
- **Bugs Visual Landing Grid**: Perbaikan visual *overflow grid* pada komponen landing page.

---

## [2.0.0] - 2026-05-28

Pembaruan utama untuk mendukung infrastruktur cloud, kemudahan deployment lokal, integrasi real-time, dan otomasi dokumen fisik.

### Added
- **Dockerization Lengkap**: Penambahan `Dockerfile` dan `docker-compose.yml` untuk memaketkan MySQL, Express, dan React menjadi satu kesatuan siap deploy.
- **Sinkronisasi Real-time WebSockets**: Mengintegrasikan Socket.io untuk pembaruan instan status pengadaan dan dasbor inventaris di browser client yang aktif.
- **Generator Dokumen BAST PDF**: Pembuatan dokumen Berita Acara Serah Terima otomatis dari database dalam format PDF resmi universitas melalui PDFKit.
- **Audit Log Diffing**: Kemampuan merekam detail audit secara mendalam yang menampilkan perbandingan nilai sebelum dan sesudah modifikasi dilakukan.

### Changed
- **Autentikasi HttpOnly Cookie**: Memindahkan token JWT dari penyimpanan lokal browser (`localStorage`) ke dalam Cookie berfitur keamanan tinggi (`HttpOnly`, `Secure`, `SameSite=Lax`).

---

## [1.0.0] - 2026-04-10

Rilis stabil pertama LokaLab Suite yang merancang fondasi sistem inventaris dan draf pengadaan laboratorium.

### Added
- **Sistem Autentikasi & RBAC Dasar**: Pembagian peran pengguna (Sys Admin, Kalab, Kaprodi, Admin, Staf Lab) dengan pemisahan rute Express dan menu navigasi.
- **Siklus Pengadaan Barang**: Alur kerja pembuatan draf pengadaan oleh Kalab, review persetujuan oleh Kaprodi, hingga penerimaan barang oleh Admin.
- **Skema Database & Seeder**: Struktur tabel lengkap di MySQL untuk mendukung data inventaris, ruangan, pengguna, dan log aktivitas awal.
