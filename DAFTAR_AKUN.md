# 🔐 Daftar Akun Demo - LokaLab Inventory

Berikut adalah daftar akun demo yang telah terdaftar di database MySQL (`lokalab_inventory`) melalui seeder. Anda dapat menggunakan akun-akun ini untuk menguji hak akses (Role-Based Access Control) dan alur kerja aplikasi secara *end-to-end*.

> [!IMPORTANT]
> **Password Default untuk Semua Akun:** `password123`

---

## 👥 Akun Berdasarkan Peran (Role)

### 1. 🛠️ System Administrator (Sys Admin)
Memiliki kontrol penuh untuk mengelola pengguna (CRUD), mengelola ruangan laboratorium (CRUD), dan melihat seluruh rekam jejak aktivitas sistem (*Audit Logs*).
* **Nama**: Anindita Hartono
* **Email**: `anindita@kampus.id`
* **Inisial**: `AH`
* **Status**: Aktif

---

### 2. 🧪 Kepala Laboratorium (Kalab)
Bertanggung jawab atas draf pengadaan tahunan untuk aset baru maupun Bahan Habis Pakai (BHP), serta meninjau persetujuan pengadaan prodi.
* **Akun Utama**:
  * **Nama**: Dr. Pradipta Wirasena
  * **Email**: `pradipta@kampus.id`
  * **Inisial**: `PW`
  * **Status**: Aktif
* **Akun Alternatif**:
  * **Nama**: Dr. Sari Wulandari
  * **Email**: `sari@kampus.id`
  * **Inisial**: `SW`
  * **Status**: Aktif

---

### 3. 🎓 Ketua Program Studi (Kaprodi)
Melakukan review draf pengadaan barang tahunan dari Kalab, menyetujui/menolak item tertentu, dan melakukan finalisasi draf pengadaan.
* **Nama**: Prof. Hendra Saputra
* **Email**: `hendra@kampus.id`
* **Inisial**: `HS`
* **Status**: Aktif

---

### 4. 💼 Staf Administrasi (Admin)
Menerima barang hasil pengadaan yang sudah difinalisasi oleh Kaprodi, mencetak label QR aset, dan melabeli inventaris baru.
* **Akun Utama**:
  * **Nama**: Faqih Ramadhan
  * **Email**: `faqih@kampus.id`
  * **Inisial**: `FR`
  * **Status**: Aktif
* **Akun Alternatif**:
  * **Nama**: Tirta Halim
  * **Email**: `tirta@kampus.id`
  * **Inisial**: `TH`
  * **Status**: Aktif

---

### 5. 🔧 Staf Laboratorium (Staf Lab)
Mengelola barang habis pakai (restock & penggunaan BHP) serta melakukan pemeliharaan (*maintenance*) dan mencatat kondisi fisik aset.
* **Akun Utama**:
  * **Nama**: Maharani Larasati
  * **Email**: `maharani@kampus.id`
  * **Inisial**: `ML`
  * **Status**: Aktif
* **Akun Alternatif**:
  * **Nama**: Daud Saputra
  * **Email**: `daud@kampus.id`
  * **Inisial**: `DS`
  * **Status**: Aktif
* **Akun Nonaktif** *(Digunakan untuk simulasi penolakan login)*:
  * **Nama**: Eggy Pratama
  * **Email**: `eggy@kampus.id`
  * **Inisial**: `EP`
  * **Status**: `paused` *(Ditangguhkan, tidak bisa login)*

---

## ⚡ Alur Pengujian End-to-End yang Direkomendasikan
Untuk merasakan integrasi database MySQL rill dan fitur real-time:
1. **Login sebagai Sys Admin (`anindita@kampus.id`)**:
   * Tambah ruangan baru atau tambah pengguna baru.
2. **Login sebagai Kalab (`pradipta@kampus.id`)**:
   * Buat Draf Pengadaan Baru untuk ruangan yang baru dibuat oleh Sys Admin. Tambahkan beberapa barang inventaris dan BHP, lalu ajukan (*Submit*).
3. **Login sebagai Kaprodi (`hendra@kampus.id`)**:
   * Buka menu Review Pengadaan, setujui atau tolak item dari Kalab, lalu tekan **Finalisasi Draf**.
4. **Login sebagai Admin (`faqih@kampus.id`)**:
   * Masuk ke Penerimaan Barang, terima item yang disetujui, dan simulasikan cetak label QR.
5. **Login sebagai Staf Lab (`maharani@kampus.id`)**:
   * Buka menu Pemeliharaan, catat pemeliharaan aset, gunakan beberapa BHP, dan perhatikan stok BHP langsung berkurang di database secara *real-time*.
6. **Periksa Dashboard**:
   * Kembali ke dashboard utama untuk melihat bagan kondisi *Donut Chart* dan *Aktivitas Tim* langsung ter-update otomatis!
