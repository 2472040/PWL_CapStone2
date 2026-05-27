Project Capstone 2
Tujuan Projek
- Melakukan digitalisasi aset laboratorium (inventaris) dan barang habis pakai (BHP).
- Menyediakan sistem pengajuan pengadaan aset dan BHP.
- Melakukan pelacakan dari siklus barang (pengadaan, pemeliharaan, penggantian/ penghapusan).

1. Administrator
- Mengelola data pengguna.
- Mengelola data ruangan.

2. Kepala Laboratorium
- Membuat draf pengadaan barang (tahunan). Draf ini membuat data inventaris dan BHP yang akan dibeli. Data-data yang dicantumkan seperti nama barang, harga, jumlah barang, dan link pembelian. Terdapat opsi untuk menambahkan barang inventaris yang akan digantikan dengan pembelian ini.
- Melihat draf pengadaan barang yang pernah diajukan. Jika draf sudah berstatus locked, maka data tidak dapat diganti.

3. Ketua Program Studi
- Melakukan review draf pengadaan barang dari kepala laboratorium.
- Kaprodi dapat memilih barang mana yang disetujui atau ditolak pengadaannya.
- Finalisasi draf pengadaan barang. Setelah melakukan finalisasi maka draf sudah tidak dapat diubah.
- [x] 3. Kriptografi Backup (AES-256-GCM)
  - [x] Ubah enkripsi di `server/controllers/backupController.js` menggunakan `aes-256-gcm` dan *Authentication Tag*
  - [x] Turunkan kunci backup dari `process.env.BACKUP_ENCRYPTION_SECRET` (bukan JWT_SECRET)
  - [x] Uji dekripsi & restore di `backupController.js` dengan memverifikasi *Auth Tag* sebelum parsing data

4. Staf Administrasi
- Melihat draf pengadaan barang yang telah disetujui oleh ketua program studi.
- Melakukan update inventaris misal dengan memberikan penomoran label dan foto QR/ Barcode
- Melakukan input tanggal penerimaan barang (Barang yang dibeli bisa datang tidak secara bersamaan).

5. Staf Laboratorium
- Mengelola stok BHP.
- Melakukan log maintenance dan update kondisi barang inventaris. Jika selama proses maintenance ada BHP yang digunakan, maka stok dalam sistem juga harus berkurang.

Ketentuan aplikasi dan basis data
Aplikasi yang dibuat boleh menggunakan salah satu kombinasi berikut
- Node.js (Full stack, Pug) + MySQL 
- Node.js (Full stack, Pug) + MongoDB
- Laravel (FE, Blade) + Node.js (BE) + MySQL
- Laravel (FE, Blade) + Node.js (BE) + MongoDB
Anda diizinkan menggunakan template dari website yang dapat ditemukan di internet (pastikan template tersebut adalah gratis)

Ketentuan
- Capstone 2 boleh dikerjakan secara perorangan atau berkelompok (max 3 orang termasuk ketua)
- Ketua kelompok bertugas mencantumkan data NRP dan anggota kelompoknya forum diskusi yang disediakan serta mencantumkan pemilihan kombinasi aplikasi dan basis data (pemilihan kombinasi dapat diubah max 1x)
- Penilaian kontribusi akan melihat dari hasil submit di Github repository (bukan melalui diskusi di media sosial atau aplikasi seperti Google Drive atau One Drive, dlsb). Pembuatan atau penyusunan CSS tidak akan dinilai. Sertakan juga basis data yang dibuat
- sSetiap minggu, Anda wajib mempresentasikan deliverable working software (perangkat lunak yang dapat digunakan dan dijalankan, bukan hasil desain dari Figma atau tools lain yang sejenis)