# 📖 Panduan Presentasi Progres LokaLab

Dokumen ini dibuat khusus untuk membantu Anda menjelaskan progres aplikasi LokaLab saat penilaian. Anda bisa membaca alur di bawah ini agar presentasi terstruktur dan tidak membingungkan.

---

## 1. Pembagian Peran (Role) dan Fitur Utama

Sistem ini memiliki 5 jenis pengguna (*role*) dengan tugas yang saling terhubung:

### 🛠️ System Administrator (Sysadmin)
* **Tugas**: Mengelola fondasi data sistem.
* **Fitur Utama**: 
  * CRUD (Tambah, Edit, Hapus) akun pengguna.
  * CRUD ruangan laboratorium.
  * Melihat **Audit Log** (rekam jejak aktivitas semua orang di sistem).

### 🧪 Kepala Laboratorium (Kalab)
* **Tugas**: Merencanakan pengadaan barang tahunan.
* **Fitur Utama**:
  * Melihat daftar inventaris di lab yang menjadi tanggung jawabnya.
  * **Membuat Draf Pengadaan**: Mengajukan daftar barang baru (aset inventaris) atau stok baru (BHP / barang habis pakai).
  * Menyerahkan draf ke Kaprodi untuk di-review.

### 🎓 Ketua Program Studi (Kaprodi)
* **Tugas**: Menyetujui atau menolak anggaran pengadaan.
* **Fitur Utama**:
  * **Review Pengadaan**: Memeriksa draf yang diajukan Kalab. Kaprodi bisa menyetujui (`Approve`) atau menolak (`Reject`) per-item barang.
  * **Finalisasi**: Mengunci draf yang sudah di-review agar barang bisa dibeli/diterima oleh Admin.
  * Melihat riwayat draf yang sudah lewat.

### 💼 Staf Administrasi (Admin)
* **Tugas**: Menerima barang fisik dan melabelinya.
* **Fitur Utama**:
  * **Penerimaan Barang (Receiving)**: Menerima barang dari draf pengadaan yang sudah difinalisasi Kaprodi. Barang otomatis masuk ke database inventaris/BHP.
  * **Manajemen Label**: Mencetak label **QR Code** untuk ditempel di barang inventaris baru.

### 🔧 Staf Laboratorium (Staf Lab)
* **Tugas**: Mengurus operasional harian lab.
* **Fitur Utama**:
  * **Maintenance (Pemeliharaan)**: Jika ada barang rusak (misal: Kalab melihat PC rusak), Staf Lab yang bertugas mencatat log perbaikannya.
  * **Manajemen Stok BHP**: Mencatat penggunaan barang habis pakai (misal: kabel, timah solder). Saat maintenance dilakukan, stok BHP terkait akan **otomatis berkurang** dari database.

---

## 2. Alur Kerja Saling Terhubung (Workflow)

### 🔄 Alur A: Pengadaan Barang Baru
1. **Sysadmin** membuatkan akun untuk Kalab dan ruangan lab baru.
2. **Kalab** masuk, lalu membuat **Draf Pengadaan** untuk membeli 10 Komputer dan 5 roll kabel UTP, lalu menekan tombol *Submit*.
3. **Kaprodi** masuk, melihat ajuan tersebut. Kaprodi menyetujui beli 10 Komputer, tapi *menolak* beli kabel UTP. Kaprodi lalu menekan **Finalisasi**.
4. **Admin** masuk, melihat bahwa ada 10 Komputer yang disetujui. Admin menerima barang tersebut (masuk ke Inventaris) dan mencetak **Label QR**-nya.

### 🔄 Alur B: Pemeliharaan & Barang Habis Pakai (BHP)
1. **Kalab** atau semua orang bisa melihat di halaman Inventaris bahwa ada AC/Komputer yang statusnya "Perlu Cek".
2. **Staf Lab** masuk, mengecek komputer tersebut, lalu membuat catatan **Maintenance**.
3. Saat memperbaiki, Staf Lab memasukkan bahwa ia menggunakan "2 buah konektor RJ45" (BHP).
4. Secara otomatis, **sistem akan mengurangi stok** konektor RJ45 di database, dan status komputer berubah kembali menjadi "Baik".
5. **Sysadmin** bisa melihat di halaman *Audit Log* bahwa Staf Lab baru saja mengubah data.