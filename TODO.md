# LokaLab — Project To-Do List

## Pembagian Kerja
| Anggota | Bagian |
|---------|--------|
| **Maliq** | Frontend React (Landing Page + Dashboard UI) |
| **Frans** | Backend (Express + MySQL + Auth + API) |
| **Anggota 3** | Integrasi Frontend ↔ Backend |

---

## 1. Frontend (Maliq)

- [x] Setup Vite + React + TailwindCSS
- [x] Landing page (Hero, Features, Pricing, Footer, dll)
- [x] App Shell (Sidebar, Navigation, Drawer, Modal, Toast)
- [x] Dashboard screen (statistik ringkasan)
- [x] Screen Sysadmin — Pengguna, Ruangan, Audit Log
- [x] Screen Kalab — Pengadaan (buat draf, tambah item)
- [x] Screen Kaprodi — Review pengadaan, Riwayat draf
- [x] Screen Admin — Penerimaan barang, Cetak label
- [x] Screen Staf Lab — Maintenance, Stok BHP
- [x] Screen Inventaris (shared, semua role bisa lihat)
- [x] Screen Settings (theme, density, logout)
- [x] Role-based routing & sidebar navigation
- [x] Custom cursor, animasi, dark/light theme
- [x] Error boundary & keyboard shortcuts
- [x] Mock data lengkap (app-data.jsx)

---

## 2. Backend (Frans)

### Fase 1 — Foundation
- [x] Install dependencies (express, sequelize, mysql2, pug, jwt, bcrypt, cors, dotenv)
- [x] Struktur folder server/ (config, models, controllers, routes, middleware, views, seeders)
- [x] File .env (konfigurasi DB + JWT)
- [x] server/config/database.js (koneksi Sequelize ke XAMPP MySQL)
- [x] server/app.js (Express setup, middleware, routing)
- [x] server/server.js (entry point, sync DB, start server)
- [x] server/package.json (override CommonJS untuk folder server)

### Fase 2 — Database (12 Tabel)
- [x] Model: User (id, name, email, password, role, status, initials, last_login)
- [x] Model: Room (id, code, name, floor, capacity, pic_user_id)
- [x] Model: Inventory (id, code, name, category, room_id, condition, serial, specs, value, acquired_date)
- [x] Model: Bhp (id, code, name, unit, stock, min_stock, last_in, category)
- [x] Model: Draft (id, code, title, created_by, status, submitted_at, finalized_at, finalized_by)
- [x] Model: DraftItem (id, draft_id, kind, name, qty, unit, price, link, replaces)
- [x] Model: DraftApproval (id, draft_item_id, approved_by, status, notes)
- [x] Model: MaintenanceLog (id, code, inventory_id, tech_user_id, action, condition_after, date)
- [x] Model: MaintenanceBhp (id, maintenance_log_id, bhp_id, qty_used)
- [x] Model: Receiving (id, draft_item_id, received_by, received_date, qty_received, notes)
- [x] Model: Label (id, inventory_id, label_number, qr_data, photo_url)
- [x] Model: AuditLog (id, user_id, action, target, ip)
- [x] models/index.js — semua associations (FK, cascade, alias)
- [x] seeders/seed.js — data awal dari mock frontend (9 users, 9 rooms, 12 inventory, 10 BHP, 3 drafts, 4 maintenance logs, 8 audit logs)

### Fase 3 — Authentication & Authorization
- [x] POST /api/auth/login — login, generate JWT token
- [x] GET /api/auth/me — info user dari token
- [x] middleware/auth.js — JWT verify + RBAC (authorize per role)
- [x] middleware/audit.js — auto logging ke audit_logs

### Fase 4 — REST API Endpoints
- [x] authController — login, me
- [x] adminController — users CRUD, rooms CRUD, audit logs
- [x] inventoryController — inventory CRUD, label update, search/filter
- [x] procurementController — drafts lifecycle (create, submit, review, approve, finalize, receiving)
- [x] maintenanceController — maintenance logs + BHP CRUD (auto deduct stock)
- [x] dashboardController — stats per role
- [x] Routes: auth, admin, inventory, procurement, maintenance, dashboard

### Fase 5 — Pug Views (Server-rendered)
- [x] views/layout.pug — base template
- [x] views/login.pug — halaman login (dark theme, glassmorphism)
- [x] views/print-label.pug — cetak label QR inventaris
- [x] views/error.pug — halaman error
- [x] Perbaiki login.pug supaya redirect ke React app setelah login berhasil

### Fase 6 — Config & Integrasi
- [x] package.json — tambah script `server` dan `seed`
- [x] vite.config.js — proxy /api, /login, /print ke Express backend
- [x] .gitignore sudah cover .env
- [x] Tambah script `dev:all` untuk jalankan frontend + backend bareng (`npm run dev:all`)

---

## 3. Integrasi Frontend ↔ Backend (Anggota 3)

### Setup
- [x] Buat file `src/services/api.js` — fetch wrapper dengan JWT token dari localStorage
- [x] Buat helper: `getToken()`, `setToken()`, `removeToken()`, `authHeaders()`

### Login / Logout Flow
- [x] Ubah flow login di React — panggil POST /api/auth/login, simpan token
- [x] Ubah flow logout — hapus token dari localStorage, redirect ke landing
- [x] Proteksi halaman dashboard — kalau tidak ada token, redirect ke login
- [x] Tampilkan info user yang sedang login dari GET /api/auth/me

### Ganti Hardcoded Data → Fetch API
- [ ] Dashboard — ambil stats dari GET /api/dashboard/stats
- [ ] Inventaris — ambil data dari GET /api/inventory (semua role)
- [ ] Detail inventaris — ambil dari GET /api/inventory/:id
- [ ] Sysadmin: Pengguna — CRUD dari /api/users
- [ ] Sysadmin: Ruangan — CRUD dari /api/rooms
- [ ] Sysadmin: Audit log — ambil dari /api/audit-logs
- [ ] Kalab: Pengadaan — CRUD draf dari /api/procurement/drafts
- [ ] Kalab: Submit draf — POST /api/procurement/drafts/:id/submit
- [ ] Kalab: Tambah item — POST /api/procurement/drafts/:id/items
- [x] Kaprodi: Review — ambil dari GET /api/procurement/review
- [x] Kaprodi: Approve/reject item — POST /api/procurement/drafts/:id/approve
- [x] Kaprodi: Finalisasi — POST /api/procurement/drafts/:id/finalize
- [x] Kaprodi: Riwayat draf — GET /api/procurement/history
- [x] Admin: Penerimaan — GET /api/procurement/receiving
- [x] Admin: Input penerimaan — POST /api/procurement/receiving
- [x] Admin: Update label — PUT /api/inventory/:id/label
- [x] Admin: List label — GET /api/inventory/manage/labels
- [ ] Staf Lab: Maintenance — GET & POST /api/maintenance
- [ ] Staf Lab: BHP — GET & PUT /api/bhp`
- Maliq = admin dan kepala lab
- Fran = Ketua prodi, staff admin
- Keyren = staff lab


### UI States
- [ ] Tambahkan loading spinner saat fetch data
- [ ] Tambahkan error message saat API gagal
- [ ] Tambahkan empty state kalau data kosong
- [ ] Tambahkan success toast setelah create/update/delete berhasil

---

## 4. Testing & Polish

- [ ] Test login dengan semua 5 role
- [ ] Test CRUD lengkap untuk setiap fitur per role
- [ ] Test flow pengadaan end-to-end: Kalab buat draf → submit → Kaprodi review → finalize → Admin terima barang
- [ ] Test maintenance: Staf Lab log maintenance → BHP otomatis berkurang
- [ ] Test role guard: role yang salah tidak bisa akses endpoint
- [ ] Responsive testing (mobile/tablet)
- [ ] Final demo preparation — working software siap dipresentasikan

---

## 5. Deliverables Akhir

- [ ] Push semua ke GitHub repository
- [ ] Sertakan database (file SQL atau seeder)
- [ ] Pastikan README.md lengkap (cara setup, cara run, akun demo)
- [ ] Screenshot / video demo working software
