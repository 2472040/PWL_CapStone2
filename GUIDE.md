# LokaLab — Panduan Setup & Testing

## Prasyarat

| Software | Keterangan |
|----------|------------|
| **Node.js** | v18+ (cek: `node -v`) |
| **XAMPP** | MySQL harus running (port 3306) |
| **MySQL Workbench** | Opsional, untuk lihat data di database |
| **Browser** | Chrome / Edge / Firefox |

---

## 1. Setup Awal (Sekali Saja)

### 1.1 Clone & Install Dependencies

```bash
git clone https://github.com/2472040/PWL_CapStone2.git
cd PWL_CapStone2
npm install
```

### 1.2 Nyalakan XAMPP MySQL

Buka XAMPP Control Panel → klik **Start** pada MySQL.

### 1.3 Buat Database

Buka **MySQL Workbench** atau terminal XAMPP, jalankan:

```sql
CREATE DATABASE IF NOT EXISTS lokalab_inventory 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Atau via terminal XAMPP:
```bash
C:\xampp\mysql\bin\mysql.exe -u root -e "CREATE DATABASE IF NOT EXISTS lokalab_inventory CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 1.4 Konfigurasi .env

File `.env` sudah ada di root project. Isinya:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=
DB_NAME=lokalab_inventory
JWT_SECRET=lokalab-secret-key-change-in-production-2026
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
```

> Kalau MySQL XAMPP kamu pakai password, ubah `DB_PASS` sesuai passwordmu.

### 1.5 Seed Database (Isi Data Awal)

```bash
npm run seed
```

Output yang diharapkan:
```
✅ Database terhubung
✅ Tabel di-reset
✅ 9 users seeded
✅ 9 rooms seeded
✅ 12 inventory items seeded
✅ 10 BHP items seeded
✅ 3 drafts with items seeded
✅ 4 maintenance logs seeded
✅ 8 audit logs seeded
🎉 Seeding selesai!
```

> ⚠️ `npm run seed` akan **menghapus semua data lama** dan mengisi ulang. Jangan jalankan kalau sudah ada data penting.

---

## 2. Menjalankan Aplikasi

### Cara Cepat (1 terminal)

```bash
npm run dev:all
```

Ini akan jalankan backend + frontend sekaligus. Atau kalau mau manual, buka **2 terminal**:

### Terminal 1 — Backend API Server

```bash
npm run server
```

Output yang diharapkan:
```
✅ Database terhubung ke MySQL
✅ Semua tabel berhasil di-sync
🚀 LokaLab API Server berjalan di http://localhost:3000
```

### Terminal 2 — Frontend React (Vite)

```bash
npm run dev
```

Output yang diharapkan:
```
  VITE v6.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

### Buka di Browser

| URL | Apa |
|-----|-----|
| `http://localhost:5173` | Frontend React (utama) |
| `http://localhost:3000/login` | Login page (Pug, server-rendered) |
| `http://localhost:3000/api/health` | Health check API |

> Frontend di port 5173 sudah diproxy ke backend port 3000. Jadi kalau frontend fetch `/api/...`, otomatis diteruskan ke Express.

---

## 3. Akun Demo untuk Login

Semua akun menggunakan password: **`password123`**

| Email | Role | Fitur yang Bisa Diakses |
|-------|------|------------------------|
| `anindita@kampus.id` | **Sys Admin** | Kelola pengguna, ruangan, audit log |
| `pradipta@kampus.id` | **Kalab** | Buat & submit draf pengadaan |
| `hendra@kampus.id` | **Kaprodi** | Review & finalisasi draf pengadaan |
| `faqih@kampus.id` | **Admin** | Penerimaan barang, cetak label |
| `maharani@kampus.id` | **Staf Lab** | Maintenance, kelola stok BHP |

---

## 4. Testing API Manual (Opsional)

Kamu bisa test API langsung di browser, Postman, atau Thunder Client.

### 4.1 Login — Dapatkan Token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"anindita@kampus.id","password":"password123"}'
```

Response:
```json
{
  "data": {
    "token": "eyJhbG...",
    "user": { "id": 1, "name": "Anindita Hartono", "role": "sysadmin" }
  }
}
```

### 4.2 Gunakan Token untuk Akses API

Salin token dari response login, lalu pakai sebagai header:

```bash
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer eyJhbG..."
```

### 4.3 Contoh Endpoint yang Bisa Ditest

| Method | Endpoint | Role | Keterangan |
|--------|----------|------|------------|
| GET | `/api/health` | Semua | Health check (tanpa auth) |
| POST | `/api/auth/login` | Semua | Login |
| GET | `/api/auth/me` | Semua | Info user dari token |
| GET | `/api/users` | sysadmin | List pengguna |
| GET | `/api/rooms` | sysadmin | List ruangan |
| GET | `/api/audit-logs` | sysadmin | Audit log |
| GET | `/api/inventory` | Semua | List inventaris |
| GET | `/api/inventory/:id` | Semua | Detail inventaris |
| GET | `/api/procurement/drafts` | kalab/kaprodi/admin | List draf pengadaan |
| GET | `/api/procurement/review` | kaprodi | Draf yang perlu di-review |
| GET | `/api/procurement/receiving` | admin | Barang yang perlu diterima |
| GET | `/api/maintenance` | staflab | Log maintenance |
| GET | `/api/bhp` | staflab/kalab | Stok BHP |
| GET | `/api/dashboard/stats` | Semua | Statistik dashboard |

---

## 5. Lihat Database di MySQL Workbench

1. Buka MySQL Workbench
2. Connect ke `localhost:3306` user `root` (tanpa password)
3. Pilih database `lokalab_inventory`
4. Kamu akan lihat 12 tabel:

```
users, rooms, inventory, bhp, drafts, draft_items,
draft_approvals, maintenance_logs, maintenance_bhp,
receiving, labels, audit_logs
```

---

## 6. Troubleshooting

### ❌ "Can't connect to MySQL server"
→ Pastikan XAMPP MySQL sudah **Start** di XAMPP Control Panel.

### ❌ "Database 'lokalab_inventory' doesn't exist"
→ Jalankan perintah CREATE DATABASE di step 1.3.

### ❌ "require is not defined in ES module scope"
→ Pastikan file `server/package.json` ada dan isinya `{ "type": "commonjs" }`.

### ❌ "EADDRINUSE: port 3000 already in use"
→ Ada proses lain di port 3000. Kill dulu:
```bash
npx kill-port 3000
```

### ❌ Data hilang / ingin reset
→ Jalankan ulang seeder:
```bash
npm run seed
```

---

## 7. Perintah NPM yang Tersedia

| Perintah | Fungsi |
|----------|--------|
| `npm run dev:all` | **Jalankan frontend + backend sekaligus** (recommended) |
| `npm run dev` | Jalankan frontend React (Vite) saja di port 5173 |
| `npm run server` | Jalankan backend Express saja di port 3000 |
| `npm run seed` | Reset & isi ulang database dengan data awal |
| `npm run build` | Build frontend untuk production |
| `npm run preview` | Preview hasil build |
