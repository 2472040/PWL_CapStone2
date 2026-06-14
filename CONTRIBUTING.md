# 🤝 Pedoman Kontribusi LokaLab Suite

Terima kasih atas minat Anda untuk berkontribusi pada LokaLab Suite! Sebagai proyek berskala enterprise yang mengelola aspek kritikal operasional laboratorium, kami menetapkan standar kontribusi yang tinggi guna menjaga keamanan, keandalan, dan kebersihan basis kode kami.

Dokumen ini memuat aturan, alur kerja, dan pedoman yang wajib diikuti oleh seluruh kontributor.

---

## 🧭 Alur Kerja Pengembangan (Workflow)

Kami menggunakan alur kerja berbasis fitur (*Feature Branch Workflow*). Semua pengembangan baru harus dibuat di branch terpisah dan digabungkan melalui *Pull Request* (PR) ke branch `main`.

```text
               ┌───────────────────────┐
               │    Buat Isu (Issue)   │
               └───────────┬───────────┘
                           ▼
               ┌───────────────────────┐
               │   Buat Branch Baru    │ (feat/..., fix/...)
               └───────────┬───────────┘
                           ▼
               ┌───────────────────────┐
               │    Commit & Push      │ (Conventional Commits)
               └───────────┬───────────┘
                           ▼
               ┌───────────────────────┐
               │  Buka Pull Request    │
               └───────────┬───────────┘
                           ▼
               ┌───────────────────────┐
               │   Review & Testing    │ (Min. 2 Reviewer)
               └───────────┬───────────┘
                           ▼
               ┌───────────────────────┐
               │  Gabungkan ke `main`   │
               └───────────────────────┘
```

---

## 🌿 Aturan Penamaan Branch

Nama branch harus deskriptif dan diawali dengan tipe perubahan untuk mempermudah identifikasi:

| Tipe Branch | Awalan | Contoh Penamaan |
| :--- | :--- | :--- |
| Fitur Baru | `feat/` | `feat/penerimaan-barang-qr` |
| Perbaikan Bug | `fix/` | `fix/audit-log-timezone-offset` |
| Dokumentasi | `docs/` | `docs/update-contributing-guide` |
| Pembersihan Kode / Refactor | `refactor/` | `refactor/optimize-sequelize-queries` |
| Konfigurasi / Tooling | `chore/` | `chore/upgrade-socket-io-dependencies` |
| Optimasi Performa | `perf/` | `perf/cache-dashboard-charts` |

---

## ✍️ Format Pesan Commit (Conventional Commits)

Kami menerapkan standar **Conventional Commits** v1.0.0. Setiap pesan commit harus mengikuti struktur berikut:

```text
<tipe>(<ruang-lingkup>): <deskripsi singkat dalam bahasa inggris atau indonesia formal>

[opsional body penjelasan detail jika diperlukan]

[opsional footer untuk menutup nomor isu]
```

### Tipe Commit yang Diizinkan:
* `feat`: Penambahan fitur baru ke sistem.
* `fix`: Perbaikan bug atau celah keamanan.
* `docs`: Perubahan atau penulisan dokumen (README, GUIDE, dll).
* `style`: Perubahan visual (layout, CSS, whitespace) yang tidak memengaruhi logika.
* `refactor`: Restrukturisasi kode tanpa mengubah fungsionalitas luar.
* `test`: Penulisan atau perbaikan unit test.
* `chore`: Tugas pemeliharaan sistem atau pembaruan konfigurasi package.

### Contoh Pesan Commit:
```text
feat(procurement): add QR code scanning for physical assets reception
fix(security): prevent XSS in audit logs details view by escaping HTML entities
docs(readme): rewrite system architecture section with Mermaid diagram
```

---

## 📂 Standar Penulisan Kode (Coding Guidelines)

* **Clean Code**: Tulis kode yang mudah dibaca dan deskriptif. Hindari penulisan komentar yang berlebihan jika kode sudah cukup menjelaskan dirinya sendiri.
* **Gaya Penulisan Nama**:
  * **CamelCase** (`NewInventoryForm`) untuk nama komponen React (JSX).
  * **camelCase** (`comparePassword`, `userId`) untuk fungsi, metode, variabel, dan berkas JavaScript biasa.
  * **snake_case** (`user_id`, `token_version`) untuk atribut database, kolom tabel, dan data relasi.
* **Konsistensi Transaksi (ACID)**: Seluruh aksi tulis yang melibatkan beberapa tabel terkait (seperti pembuatan item draf dan log audit) wajib dibungkus dalam transaksi Sequelize (`sequelize.transaction`) untuk menjamin konsistensi data.
* **Validasi Skema**: Seluruh payload yang masuk ke API harus divalidasi dengan **Zod** di sisi backend sebelum diproses oleh database.

---

## 🧪 Panduan Pengujian (Testing)

Sebelum membuka Pull Request, kontributor wajib menjalankan seluruh automated test secara lokal untuk memastikan tidak ada perubahan yang merusak fitur keamanan global:

```bash
# Menjalankan pengujian keamanan (enkripsi, RBAC, hash chaining)
npm run security-test
```

Pastikan status pengujian berstatus **PASS** sebelum di-push ke GitHub.

---

## 🔀 Alur Pull Request (PR)

1. Pastikan branch Anda telah diperbarui dengan branch `main` terbaru (`git pull origin main`).
2. Gunakan **[Template Pull Request](.github/PULL_REQUEST_TEMPLATE.md)** saat membuat PR di GitHub.
3. PR Anda harus ditinjau dan disetujui (*Approved*) oleh minimal **2 kontributor inti** sebelum dapat di-merge.
4. Semua pengecekan otomatis (jika ada CI/CD) harus berstatus hijau (*green*).
5. Merge akan dilakukan menggunakan metode **Squash and Merge** untuk menjaga riwayat branch `main` tetap bersih dan linier.
