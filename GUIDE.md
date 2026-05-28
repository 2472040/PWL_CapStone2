# LokaLab — Panduan Setup & Testing

LokaLab Suite adalah aplikasi sistem inventaris & pengadaan laboratorium tingkat SaaS dengan integrasi WebSockets real-time, cetak BAST (Berita Acara Serah Terima) dalam format PDF resmi, audit log diffing ("Sebelum ➔ Sesudah"), serta dukungan penuh Dockerization.

## 🚀 OPSI 1: Setup Mudah & Instan (Menggunakan Docker - Direkomendasikan)

Dengan Docker, Anda **tidak perlu menginstal XAMPP, Node.js, atau membuat database secara manual**. Cukup satu perintah, dan seluruh aplikasi (MySQL, Server API Node.js, dan Vite React) akan otomatis dikonfigurasi dan dijalankan.

### Prasyarat Opsi 1
* Sudah memasang **Docker** dan **Docker Desktop** di komputer Anda.

### Cara Menjalankan
1. Pastikan port `3306`, `3000`, dan `5173` di komputer Anda sedang tidak terpakai (matikan XAMPP atau proses Node.js lokal jika ada).
2. Jalankan perintah berikut di terminal root proyek:
   ```bash
   docker-compose up --build -d
   ```
   kalo udah ada dan pernah di build gunakan command
   ```
    docker-compose up -d
  ```
3. Docker secara otomatis akan mengunduh database MySQL, membangun container backend & frontend, menyinkronkan tabel, dan mengaktifkan web.
4. Buka browser dan buka **`http://localhost:5173`**!
5. Untuk mematikan server dengan aman setelah selesai digunakan, jalankan:
   ```bash
   docker-compose down
   ```

---

## 🛠️ OPSI 2: Setup Manual secara Lokal (Tanpa Docker)

### Prasyarat Opsi 2
| Software | Keterangan |
|----------|------------|
| **Node.js** | v18+ (cek: `node -v`) |
| **XAMPP** | MySQL harus running (port 3306) |
| **MySQL Workbench** | Opsional, untuk lihat data di database |
| **Browser** | Chrome / Edge / Firefox |

### 1. Setup Awal (Sekali Saja)

#### 1.1 Clone & Install Dependencies
```bash
git clone https://github.com/2472040/PWL_CapStone2.git
cd PWL_CapStone2
npm install
```

#### 1.2 Nyalakan XAMPP MySQL
Buka XAMPP Control Panel → klik **Start** pada MySQL.

#### 1.3 Buat Database
Buka **MySQL Workbench** atau terminal XAMPP, jalankan:
```sql
CREATE DATABASE IF NOT EXISTS lokalab_inventory 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### 1.4 Konfigurasi .env
File `.env` sudah ada di root project. Isinya:
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

#### 1.5 Seed Database (Isi Data Awal)
```bash
npm run seed
```

---

### 2. Menjalankan Aplikasi secara Manual

Jalankan perintah ini di terminal Anda:
```bash
npm run dev:all
```
Ini akan menjalankan backend server API (port `3000`) dan frontend Vite React (port `5173`) secara bersamaan.

---

## 🔑 3. Akun Demo untuk Login

Semua akun menggunakan password: **`password123`**

| Email | Role | Fitur yang Bisa Diakses |
|-------|------|------------------------|
| `anindita@kampus.id` | **Sys Admin** | Kelola pengguna, ruangan, audit log ("Sebelum ➔ Sesudah") |
| `pradipta@kampus.id` | **Kalab** | Buat draf pengadaan, real-time update sync |
| `hendra@kampus.id` | **Kaprodi** | Review & finalisasi draf pengadaan |
| `faqih@kampus.id` | **Admin** | Penerimaan barang, cetak label, unduh BAST PDF resmi |
| `maharani@kampus.id` | **Staf Lab** | Maintenance log, kelola stok BHP |

---

## ⚡ 4. Fitur-Fitur Premium Baru

### 4.1 Real-time Sync (WebSockets)
Aplikasi menggunakan **Socket.io** untuk melakukan sinkronisasi data secara real-time. Ketika Kaprodi atau Kalab mengubah status pengadaan, backend akan memancarkan sinyal ke seluruh client yang sedang online untuk memperbarui dashboard secara otomatis tanpa reload halaman.

### 4.2 Laporan BAST PDF Resmi
Saat draf pengadaan diselesaikan (`completed`), Staf Admin dapat mengunduh dokumen **Berita Acara Serah Terima (BAST)** resmi dalam format PDF berstandar universitas melalui tombol **"Cetak BAST (PDF)"** di rincian pengadaan. 
* Endpoint API: `GET /api/procurement/drafts/:id/pdf`

### 4.3 Audit Log Diffing ("Sebelum ➔ Sesudah")
Halaman audit log pada peran **Sys Admin** kini merekam perubahan data secara detail. Log tidak hanya menuliskan *"memperbarui ruangan"* tetapi menuliskan perubahan properti secara spesifik, seperti:
`[Kapasitas: 30 ➔ 45, Deskripsi: Lab A ➔ Lab Utama]`

---

## 🧪 5. Testing API Manual & Keamanan

### Pengujian Unit Keamanan
Anda dapat menjalankan automated security tests yang memverifikasi integritas RBAC, enkripsi backup AES-256-GCM, dan hash chaining audit log:
```bash
npm run security-test
```

### Contoh Endpoint API Penting
| Method | Endpoint | Role | Keterangan |
|--------|----------|------|------------|
| GET | `/api/health` | Semua | Health check (tanpa auth) |
| POST | `/api/auth/login` | Semua | Login |
| GET | `/api/procurement/drafts/:id/pdf` | Admin | Cetak PDF Berita Acara Serah Terima |
| GET | `/api/audit-logs` | sysadmin | Audit log terenkripsi & ter-diff |

---

## ❓ 6. Troubleshooting (Pemecahan Masalah)

### ❌ Port EADDRINUSE (Port sudah terpakai)
Terjadi jika port `3000` atau `5173` sedang dipakai oleh proses lain. Matikan proses tersebut secara paksa:
```bash
npx kill-port 3000
npx kill-port 5173
```

### ❌ Data tidak sinkron atau ingin reset
Jalankan ulang seeder untuk mengembalikan data awal bawaan:
```bash
npm run seed
```

---

## 📦 7. Perintah Script NPM yang Tersedia

| Perintah | Fungsi |
|----------|--------|
| `npm run dev:all` | Menjalankan frontend Vite dan backend Express sekaligus |
| `npm run seed` | Mereset dan mengisi database dengan data awal demo |
| `npm run security-test` | Menjalankan 10 pengujian keamanan & enkripsi |
| `npm run build` | Melakukan build frontend untuk siap produksi |
| `npm run preview` | Preview hasil build |
