# 🚀 Panduan Pemasangan & Pengujian Sistem LokaLab

LokaLab Suite dirancang dengan mengutamakan kemudahan pemasangan (_deployment_) di lingkungan lokal maupun produksi. Proyek ini mendukung penuh kontainerisasi menggunakan Docker serta konfigurasi manual terpisah.

---

## 🐋 Opsi 1: Pemasangan Menggunakan Docker (Sangat Direkomendasikan)

Dengan menggunakan Docker, Anda **tidak perlu menginstal Node.js, database MySQL secara terpisah, atau melakukan konfigurasi tabel secara manual**. Seluruh dependensi dan konfigurasi jaringan kontainer (MySQL, Server Backend Express, dan App Frontend Vite React) telah diatur secara otomatis.

### 📋 Prasyarat Docker

- Docker Desktop atau Docker Engine telah terpasang dan aktif di komputer Anda.

### ⚙️ Langkah-Langkah Menjalankan

1. Pastikan port `3306`, `3000`, dan `5173` di mesin lokal Anda tidak sedang digunakan oleh layanan lain (seperti XAMPP MySQL atau proses Node.js lokal).
2. Buka terminal pada direktori utama (_root_) proyek dan jalankan perintah berikut untuk membangun (_build_) dan mengaktifkan kontainer:
   ```bash
   docker-compose up --build -d
   ```
3. Jika kontainer sudah pernah dibangun sebelumnya, Anda cukup mengaktifkannya kembali menggunakan perintah:
   ```bash
   docker-compose up -d
   ```
4. Sistem secara otomatis akan menyiapkan database MySQL, menyinkronkan skema tabel, mengisi data awal (_seed_), dan menjalankan seluruh server aplikasi.
5. Akses antarmuka pengguna melalui peramban web di alamat: **`http://localhost:5173`**
6. Untuk menghentikan seluruh layanan kontainer secara aman setelah selesai digunakan, jalankan perintah:
   ```bash
   docker-compose down
   ```

---

## 🛠️ Opsi 2: Pemasangan Manual Secara Lokal (Tanpa Docker)

Opsi ini digunakan jika Anda ingin melakukan pengembangan (_development_) aktif secara manual di mesin lokal Anda tanpa virtualisasi.

### 📋 Prasyarat Manual

| Komponen                 | Versi Minimal | Kegunaan                                                           |
| :----------------------- | :------------ | :----------------------------------------------------------------- |
| **Node.js**              | v18+          | Runtime eksekusi JavaScript (Backend & Frontend Builder)           |
| **XAMPP / MySQL Server** | Port 3306     | Media penyimpanan data relasional utama                            |
| **Layanan Web Browser**  | Versi Modern  | Peramban untuk mengakses antarmuka LokaLab (Chrome, Edge, Firefox) |

### 🔧 Langkah-Langkah Setup Awal (Hanya Sekali)

#### 1. Pemasangan Dependensi

Buka terminal pada direktori proyek dan jalankan perintah pemasangan pustaka dependensi untuk backend dan frontend:

```bash
npm install
```

#### 2. Konfigurasi Basis Data MySQL

1. Aktifkan modul **MySQL** pada Control Panel XAMPP Anda.
2. Hubungkan ke database lokal menggunakan aplikasi pengelola database (seperti MySQL Workbench atau phpMyAdmin), kemudian jalankan perintah SQL berikut untuk membuat skema basis data baru:
   ```sql
   CREATE DATABASE IF NOT EXISTS lokalab_inventory
   CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

#### 3. Konfigurasi Berkas Lingkungan (`.env`)

Pastikan berkas `.env` di direktori utama (_root_) proyek telah terkonfigurasi dengan benar sebagai berikut:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=
DB_NAME=lokalab_inventory
JWT_SECRET=lokalab-secret-key-change-in-production-2026
BACKUP_ENCRYPTION_SECRET=lokalab-super-secure-backup-secret-key-2026
AUDIT_LOG_SECRET=lokalab-super-secure-audit-secret-key-2026
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
```

#### 4. Pengisian Data Awal (Database Seeding)

Jalankan perintah seeder untuk menyinkronkan seluruh tabel basis data Sequelize dan memasukkan daftar akun demo standar:

```bash
npm run seed
```

---

## 🏃‍♂️ Menjalankan Aplikasi Secara Manual

Setelah seluruh langkah setup awal di atas berhasil diselesaikan, Anda dapat menjalankan backend dan frontend secara bersamaan menggunakan perintah terintegrasi berikut:

```bash
npm run dev:all
```

- **Layanan Frontend (Vite + React)** akan berjalan pada port `5173` (akses: `http://localhost:5173`)
- **Layanan Backend API (Express.js)** akan berjalan pada port `3000`.

---

## 🧪 Pengujian Terotomatisasi (Unit & Keamanan)

LokaLab Suite dilengkapi dengan rangkaian uji terotomatisasi (Vitest) untuk memverifikasi fungsionalitas CRUD inventaris, siklus pemeliharaan & draf pengadaan, logika backend, RBAC, algoritma enkripsi backup, proteksi _Rate Limiting_, dan integritas rantai audit log.

Jalankan seluruh 41 unit & integration test dengan perintah berikut:

```bash
npm run test
```

Untuk menjalankan khusus pengujian keamanan dan integritas enkripsi cadangan saja:

```bash
npm run security-test
```

---

## ❓ Pemecahan Masalah (Troubleshooting)

### ❌ Error: Port EADDRINUSE (Port 3000 atau 5173 telah digunakan)

Masalah ini terjadi jika ada sisa proses Node.js yang masih berjalan di latar belakang. Anda dapat menghentikan paksa proses yang menggunakan port tersebut menggunakan utilitas bawaan:

```powershell
# Menghentikan proses pada port 3000 & 5173 secara paksa
npx kill-port 3000
npx kill-port 5173
```

### ❌ Inkonsistensi Data Basis Data

Jika data basis data Anda mengalami kerusakan selama pengujian fungsionalitas, Anda dapat melakukan reset database ke kondisi awal demo dengan menjalankan kembali perintah:

```bash
npm run seed
```

---

## 📦 Daftar Skrip NPM yang Tersedia

| Skrip Perintah          | Kegunaan Fungsional                                                                             |
| :---------------------- | :---------------------------------------------------------------------------------------------- |
| `npm run dev:all`       | Menjalankan server backend Express dan frontend Vite secara bersamaan dalam mode _development_. |
| `npm run seed`          | Melakukan reset database dan mengisi ulang data standar akun demo.                              |
| `npm run db:migrate`    | Menjalankan seluruh berkas migrasi database Sequelize secara berurutan.                         |
| `npm run test`          | Mengeksekusi seluruh 41 unit & integration test menggunakan Vitest.                             |
| `npm run security-test` | Mengeksekusi rangkaian uji unit keamanan dan integritas enkripsi cadangan menggunakan Vitest.   |
| `npm run build`         | Melakukan kompilasi (_compile_) kode frontend menjadi berkas siap produksi pada folder `/dist`. |
| `npm run preview`       | Menjalankan server lokal untuk melakukan peninjauan hasil build produksi frontend.              |
