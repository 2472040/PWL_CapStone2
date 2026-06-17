# 📜 Catatan Rilis LokaLab Suite (Changelog)

Semua pembaruan penting pada proyek LokaLab Suite akan dicatat di dokumen ini. Format dokumen ini mengacu pada [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) dan mematuhi aturan [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.2.0] - 2026-06-17

Rilis versi ini mengimplementasikan 12 persyaratan operasional baru untuk tata kelola laboratorium kelas enterprise, meningkatkan pengujian integrasi menjadi 41 test case, serta memperbarui validasi dual QR dan pembatasan peran akses.

### Added

- **Penyaringan BHP Berbasis Ruangan**: Menambahkan kolom `room_id` pada tabel `bhp` beserta relasi model Sequelize dan filter dropdown ruangan di antarmuka pengguna BHP.
- **Skenario Dual QR**: Integrasi pustaka `jsQR` di frontend untuk mendekode barcode QR Universitas yang diunggah dan menghasilkan label QR sistem yang sesuai secara dinamis.
- **Pencatatan Kondisi Barang Saat Diterima**: Formulir penerimaan barang oleh Staff Admin mendukung opsi penetapan kondisi fisik unit (Baik, Perlu cek, Rusak).
- **Penguncian Draf Pengadaan**: Mengunci draf pengadaan (`submitted`) setelah diajukan oleh Kalab agar tidak dapat diedit secara sepihak sebelum ditinjau oleh Kaprodi.
- **Dukungan Multi-Aset Pemeliharaan**: Formulir pencatatan pemeliharaan aset fisik kini mendukung pemilihan beberapa unit sekaligus melalui checkbox.
- **Rangkaian Uji Integrasi Vitest Lengkap**: Mengembangkan suite pengujian hingga mencapai total 41 test case untuk memastikan stabilitas RBAC dan fungsionalitas operasional.

### Changed

- **Restriksi Ketat Peran RBAC**:
  - System Administrator (Sysadmin / Administrasi) diblokir sepenuhnya dari akses membaca menu Inventaris & BHP.
  - Staf Admin (Admin) diblokir dari melakukan modifikasi stok BHP secara langsung, tetapi diberikan hak akses untuk mengajukan draf restock BHP.
  - Staf Lab & Staf Admin kini dapat mengajukan restock BHP melalui tombol "Ajukan Restock".

---

## [3.1.0] - 2026-06-15

Versi rilis ini berfokus pada refactoring arsitektur frontend (routing dinamis berbasis URL dan state management tersentralisasi dengan Zustand), pemisahan logika bisnis backend ke Service Layer, migrasi database formal dengan Sequelize CLI, dan penambahan sistem pembatasan laju (sliding-window rate limiter) berbasis Redis.

### Added

- **State Management dengan Zustand**: Membuat global store Zustand (`src/store/useAppStore.js`) untuk menggantikan monolith React Context, mengizinkan re-render selektif menggunakan selector.
- **Routing Berbasis URL (React Router v6)**: Menggantikan conditional rendering UI berbasis parameter state dengan routing dinamis (`BrowserRouter`, `<Routes>`, `<Route>`) untuk navigasi browser formal (back, forward, deep-linking).
- **Service Layer Backend**: Mengekstrak logika database transaksional berat dari controllers ke modul service mandiri (`server/services/maintenanceService.js` & `server/services/procurementService.js`).
- **Migrasi Database Formal (Sequelize CLI)**: Menambahkan skema migrasi database (`server/migrations/`) untuk standarisasi skema database tanpa dependensi sync paksa di produksi.
- **Sliding Window Rate Limiter**: Rate limiter tangguh berbasis Redis (ZSET) dengan mekanisme fallback otomatis ke memori lokal jika koneksi Redis terputus (fail-safe).
- **Rangkaian Uji Integrasi (30 Vitest Tests)**: Penambahan suite pengujian integrasi lengkap mencakup alur CRUD inventaris, pemeliharaan aset, stok BHP, dan alur pengadaan barang.

### Changed

- **Kompatibilitas Mundur Context**: Mengemas ulang context provider lama (`store-context.jsx`) sebagai wrapper di atas Zustand store untuk mencegah kerusakan pada komponen UI yang sudah ada.
- **Pembersihan Logika Controller**: Menyederhanakan controller Express (`maintenanceController.js` dan `procurementController.js`) untuk hanya menangani HTTP request dan response.

---

## [3.0.0] - 2026-06-14

Versi rilis ini berfokus pada penguatan arsitektur keamanan, peningkatan kriptografi, integrasi validasi data backend, serta pembersihan antarmuka dashboard pengguna secara menyeluruh.

### Added

- **Optimalisasi Performa Frontend (Code Splitting)**: Penerapan pemisahan kode dinamis (`React.lazy` & `Suspense`) pada seluruh modal dan laci (_drawers_) untuk memotong ukuran bundel awal dari 3.3 MB menjadi < 500 KB demi pemuatan aplikasi yang instan.
- **Penyegaran Token Otomatis (Refresh Token Rotation)**: Pengamanan sesi login bertipe HttpOnly cookie menggunakan token ganda (Access & Refresh Token) dengan deteksi penggunaan ulang otomatis (_Reuse Detection_).
- **Arsitektur Penanganan Error Terpusat**: Middleware penanganan kesalahan global (`globalErrorHandler`) dan kelas exception kustom (`AppError`, dll) untuk merapikan kode kontroler backend.
- **Enkripsi Cadangan AES-256-GCM**: Mengganti enkripsi CBC lama dengan Galois/Counter Mode (GCM) yang menyediakan verifikasi integritas data bawaan via _Authentication Tag_.
- **Derivasi Kunci scrypt**: Kunci enkripsi cadangan didefinisikan menggunakan KDF `scrypt` dengan _salt_ dinamis 16-byte acak untuk ketahanan penuh terhadap serangan dekripsi offline.
- **Audit Trail Anti-Tamper**: Penambahan middleware hash chaining berbasis HMAC-SHA256 untuk memproteksi tabel `audit_logs` dari manipulasi basis data.
- **Validasi Integritas Kriptografis**: Tombol verifikasi rantai audit di halaman Sys Admin untuk mendeteksi manipulasi log secara otomatis.
- **Pembersihan Blacklist Token Otomatis**: Rutin Express yang otomatis dijalankan saat server naik dan berkala setiap 6 jam untuk menghapus token usang dari database.
- **Form Inventaris & Pemeliharaan Baru**: Menambahkan berkas `NewInventoryForm.jsx` dan menyempurnakan `BHP.jsx` & `MaintenanceForm.jsx` untuk kontrol penuh atas log pemeliharaan fisik.
- **Dokumentasi MIT License**: Lisensi legal ditambahkan secara resmi ke proyek.

### Changed

- **Pemisahan Kunci Rahasia**: Memisahkan `.env` key menjadi tiga bagian independen (`JWT_SECRET`, `BACKUP_ENCRYPTION_SECRET`, `AUDIT_LOG_SECRET`).
- **Peningkatan RBAC**: Penolakan sesi global secara otomatis via peningkatan `token_version` di database jika terdapat penggantian kata sandi atau peran oleh admin.
- **Transisi Landing Page**: Penguncian tinggi _header_ dan optimasi animasi _reveal_ tombol sign-in menggunakan `IntersectionObserver`.

### Fixed

- **Kasus Khusus macOS/Windows Git Fetch**: Menyelesaikan konflik penamaan branch case-sensitive (`Fran`/`fran`) pada sistem file Windows.
- **Bugs Visual Landing Grid**: Perbaikan visual _overflow grid_ pada komponen landing page.

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
