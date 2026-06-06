# Revisi Capstone 2 — To-Do List (Gabungan Catatan Keyren & Fran)

## Administrator
- [ ] Password saat menambah pengguna harus diketik dua kali (konfirmasi password)
- [ ] Bisa menghapus akun pengguna yang baru saja dibuat
- [ ] Menu BHP dan Inventaris **tidak perlu** ada di role Administrator

## Kepala Lab (Kalab)
- [ ] Tren keuangan di dashboard boleh dihapus (tidak wajib)
- [ ] Daftar draf pengadaan harus ada **filter per bulan dan per tahun**
- [ ] Link pembelian wajib ada di setiap item pengadaan
- [ ] Satu pengajuan pengadaan harus bisa berisi **banyak barang** (bukan satu-satu)
- [ ] Tombol "Ajukan Pengadaan Barang" (yang terpisah) dihapus, karena sudah ada di dalam draf
- [ ] Draf yang sudah di-submit harus bisa **di-lock oleh Kalab sendiri**, bukan oleh Kaprodi
- [ ] Tambah filter **per ruangan** di halaman BHP

## Ketua Prodi (Kaprodi)
- [ ] Riwayat draf harus ada **filter per tahun**
- [ ] Tambahkan menu **BHP** di Kaprodi (view only)
- [ ] Menu **BHP dan Inventaris** bisa dilihat di **semua role kecuali Administrator**
- [ ] Review pengadaan: tombol approve/reject harus ada di **luar** (daftar), bukan harus masuk ke dalam detail pengadaan dulu

## Staf Administrasi
- [ ] Restock BHP manual dihapus; pengadaan BHP harus melalui **pengajuan** (draf pengadaan)
- [ ] Penerimaan barang harus bisa **parsial** (misal pesan 2, datang 1 → dicatat 1 dulu, sisanya menyusul)
- [ ] Ditandai terima sesuai jumlah barang yang datang, termasuk jika ada barang cacat
- [ ] QR Code ada **dua jenis per barang**:
  - QR internal: di-generate otomatis oleh sistem saat barang diterima
  - QR universitas: di-upload manual oleh staf admin (foto QR dari kampus)
- [ ] Satu barang = satu QR. Kalau pesan 2 unit, maka QR-nya juga 2 (masing-masing unit punya QR sendiri)
- [ ] Setelah QR universitas di-upload, sistem akan men-generate QR internal baru yang menggabungkan info tersebut
- [ ] Staf Admin **tidak bisa mengelola BHP** (tambah/kurang stok manual) — itu tugasnya Staf Lab

## Staf Lab
- [x] Maintenance harus bisa **memilih banyak aset sekaligus** (misal 1 ruangan ada 5 aset rusak, bisa dipilih semua langsung, tidak satu-satu)
- [ ] Tambah **filter** di halaman Inventaris dan BHP
- [ ] Pengelolaan tambah/kurang stok BHP ada di Staf Lab (dipindahkan dari Staf Admin)
