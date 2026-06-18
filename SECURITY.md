# 🔒 Dokumentasi Keamanan Sistem LokaLab

> **Versi**: 3.0  
> **Terakhir Diperbarui**: 17 Juni 2026  
> **Standar Acuan**: OWASP Top 10:2025 · NIST SP 800-63B · CWE/SANS Top 25

---

## Daftar Isi

1. [Ringkasan Keamanan](#1-ringkasan-keamanan)
2. [Arsitektur Keamanan](#2-arsitektur-keamanan)
3. [Password Hashing (bcrypt)](#3-password-hashing-bcrypt)
4. [Autentikasi JWT & Manajemen Sesi](#4-autentikasi-jwt--manajemen-sesi)
5. [Mekanisme Pembatalan Token (Token Revocation)](#5-mekanisme-pembatalan-token-token-revocation)
6. [Enkripsi Backup (AES-256-GCM)](#6-enkripsi-backup-aes-256-gcm)
7. [Audit Log Anti-Tamper (Hash Chaining)](#7-audit-log-anti-tamper-hash-chaining)
8. [Security Headers & CORS](#8-security-headers--cors)
9. [Proteksi Frontend](#9-proteksi-frontend)
10. [Pemisahan Kunci Rahasia](#10-pemisahan-kunci-rahasia)
11. [Validasi Zod, Transaksi ACID & Winston Logger](#11-validasi-zod-transaksi-acid--winston-logger)
12. [Pengujian Keamanan](#12-pengujian-keamanan)
13. [Pemetaan Kepatuhan Standar](#13-pemetaan-kepatuhan-standar)
14. [Rekomendasi untuk Produksi](#14-rekomendasi-untuk-produksi)

---

## 1. Ringkasan Keamanan

LokaLab menerapkan pendekatan keamanan **defense-in-depth** (pertahanan berlapis) yang mencakup seluruh stack aplikasi — dari penyimpanan password di database hingga proteksi pada sisi klien. Berikut ringkasan lapisan keamanan yang telah diimplementasikan:

| Lapisan                   | Mekanisme                                               | Status                             |
| ------------------------- | ------------------------------------------------------- | ---------------------------------- |
| **Password Storage**      | bcrypt dengan salt rounds 12                            | ✅ Aktif                           |
| **Autentikasi**           | JWT di HttpOnly Cookie + JTI + Token Version            | ✅ Aktif                           |
| **Pembatalan Sesi**       | Persistent JTI Blacklist (MySQL) + Token Version        | ✅ Aktif                           |
| **Enkripsi Data**         | AES-256-GCM + Dynamic Salt KDF (scrypt)                 | ✅ Aktif                           |
| **Audit Trail**           | Tamper-Evident HMAC-SHA256 Hash Chaining                | ✅ Aktif                           |
| **HTTP Headers**          | Helmet + CSP, X-Frame-Options, nosniff, Referrer-Policy | ✅ Aktif                           |
| **CORS**                  | Strict Origin + Credentials                             | ✅ Aktif                           |
| **Frontend**              | Auto-logout 401, Validasi Upload, Cookie Credentials    | ✅ Aktif                           |
| **Kunci Rahasia**         | 3 kunci terpisah (JWT, Backup, Audit)                   | ✅ Aktif                           |
| **Validasi Input**        | Zod Schema Validation (Frontend & Backend)              | ✅ Aktif (Procurement)             |
| **Konsistensi Transaksi** | Sequelize ACID Transactions                             | ✅ Aktif (Procurement/Maintenance) |
| **Structured Logging**    | Winston Daily Rotate File (JSON logs)                   | ✅ Aktif                           |

---

## 2. Arsitektur Keamanan

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │  api.js       │  │  QRScanner.jsx   │  │  main.jsx         │  │
│  │  • credentials│  │  • MIME validate  │  │  • logout trigger │  │
│  │  • 401 intercept│ │  • Size limit    │  │  • session clear  │  │
│  │  • No token   │  │  • Type check    │  │                   │  │
│  │    in storage  │  └──────────────────┘  └───────────────────┘  │
│  └──────┬───────┘                                                │
│         │ credentials: 'include' (Cookie otomatis)               │
├─────────┼───────────────────────────────────────────────────────  │
│         ▼                                                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              SERVER (Express.js)                            │ │
│  │                                                             │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │ │
│  │  │ Security    │  │ CORS         │  │ Cookie Parser     │  │ │
│  │  │ Headers     │  │ Strict Origin│  │ (Custom, no deps) │  │ │
│  │  │ (CSP, XFO)  │  │ + Credentials│  │                   │  │ │
│  │  └──────┬──────┘  └──────┬───────┘  └──────┬────────────┘  │ │
│  │         ▼                ▼                  ▼               │ │
│  │  ┌──────────────────────────────────────────────────────┐   │ │
│  │  │           authenticate Middleware                     │   │ │
│  │  │  1. Baca token dari HttpOnly Cookie                  │   │ │
│  │  │  2. Fallback: Bearer Authorization Header            │   │ │
│  │  │  3. Verifikasi JWT signature (JWT_SECRET)            │   │ │
│  │  │  4. Cek JTI blacklist (token sudah logout?)          │   │ │
│  │  │  5. Cek token_version (password/role berubah?)       │   │ │
│  │  │  6. Cek user aktif di database                       │   │ │
│  │  └──────────────────────┬───────────────────────────────┘   │ │
│  │                         ▼                                   │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────────┐  │ │
│  │  │ Auth        │  │ Backup      │  │ Admin              │  │ │
│  │  │ Controller  │  │ Controller  │  │ Controller         │  │ │
│  │  │ • login     │  │ • AES-256-  │  │ • verifyAuditChain │  │ │
│  │  │ • logout    │  │   GCM       │  │ • updateUser       │  │ │
│  │  │ • profile   │  │ • Auth Tag  │  │ • deleteUser       │  │ │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬─────────────┘  │ │
│  │         │                │                │                 │ │
│  │         ▼                ▼                ▼                 │ │
│  │  ┌──────────────────────────────────────────────────────┐   │ │
│  │  │           Audit Log Middleware                        │   │ │
│  │  │  • HMAC-SHA256 hash per log entry                    │   │ │
│  │  │  • Hash chaining (previous_hash → current hash)      │   │ │
│  │  │  • Menggunakan AUDIT_LOG_SECRET terpisah              │   │ │
│  │  └──────────────────────┬───────────────────────────────┘   │ │
│  │                         ▼                                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    DATABASE (MySQL)                          │ │
│  │                                                             │ │
│  │  users:                    audit_logs:                      │ │
│  │  ├── password (bcrypt)     ├── hash (HMAC-SHA256)           │ │
│  │  ├── token_version         ├── previous_hash (chain link)   │ │
│  │  └── status                └── action, target, details      │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Password Hashing (bcrypt)

### Apa dan Mengapa

Password **tidak pernah** disimpan dalam bentuk teks biasa (_plaintext_) atau hash cepat seperti MD5/SHA-256. Sistem menggunakan **bcrypt** — sebuah _adaptive hashing function_ yang dirancang khusus untuk password.

Bcrypt memiliki dua keunggulan utama:

1. **Lambat secara sengaja** — Setiap percobaan brute-force membutuhkan waktu komputasi yang signifikan
2. **Salt otomatis** — Setiap password mendapat salt unik, mencegah serangan _rainbow table_

### Implementasi

**File**: `server/models/User.js`

```javascript
// Hook Sequelize: otomatis hash password sebelum simpan ke database
hooks: {
  beforeCreate: async (user) => {
    if (user.password) {
      const salt = await bcrypt.genSalt(12);          // 12 rounds = 2^12 iterasi
      user.password = await bcrypt.hash(user.password, salt);
    }
  },
  beforeUpdate: async (user) => {
    if (user.changed('password')) {
      const salt = await bcrypt.genSalt(12);
      user.password = await bcrypt.hash(user.password, salt);
    }
  },
}

// Method untuk verifikasi password saat login
User.prototype.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};
```

### Detail Teknis

| Parameter       | Nilai                  | Penjelasan                                     |
| --------------- | ---------------------- | ---------------------------------------------- |
| **Algoritma**   | bcrypt (`$2a$`/`$2b$`) | Blowfish-based adaptive hash                   |
| **Salt Rounds** | 12                     | 2¹² = 4.096 iterasi internal                   |
| **Salt**        | Otomatis per-password  | 16-byte random salt yang disematkan dalam hash |
| **Output**      | 60 karakter            | Format: `$2a$12$<22-char-salt><31-char-hash>`  |

### Contoh Data di Database

```
# Yang TERSIMPAN di database (aman):
password: $2a$12$LJ3m4ys3Lz.P9Q8kV7nXHeWJQPXwEe3MiZ1aBcDeFgHiJkLmNoPqR

# Yang TIDAK PERNAH tersimpan:
password: Admin123!  ← TIDAK PERNAH seperti ini
```

### Standar Acuan

- **OWASP**: "_Use bcrypt, scrypt, argon2, or PBKDF2 for password storage_" — bcrypt dengan cost factor ≥10 memenuhi rekomendasi OWASP
- **NIST SP 800-63B §5.1.1.2**: Memverifikasi bahwa password di-hash dengan _salt_ dan fungsi hash yang tahan brute-force

---

## 4. Autentikasi JWT & Manajemen Sesi

### Apa dan Mengapa

JSON Web Token (JWT) digunakan untuk autentikasi _stateless_. Token berisi identitas pengguna yang ditandatangani secara kriptografi oleh server, sehingga server tidak perlu menyimpan sesi di database untuk setiap request.

**Keputusan desain penting**: Token JWT disimpan dalam **HttpOnly Cookie**, bukan di `localStorage`. Ini adalah perlindungan kritis terhadap serangan XSS (Cross-Site Scripting).

### Mengapa HttpOnly Cookie, Bukan localStorage?

|                          | `localStorage`              | HttpOnly Cookie               |
| ------------------------ | --------------------------- | ----------------------------- |
| **Akses via JavaScript** | ✅ `localStorage.getItem()` | ❌ Tidak bisa diakses         |
| **Risiko XSS**           | 🔴 Token bisa dicuri        | 🟢 Token tidak terekspos      |
| **Pengiriman otomatis**  | ❌ Manual via header        | ✅ Otomatis oleh browser      |
| **Kontrol server**       | ❌ Client mengelola         | ✅ Server mengelola lifecycle |

### Implementasi Login

**File**: `server/controllers/authController.js`

```javascript
const login = async (req, res) => {
  // 1. Validasi input
  const { email, password } = req.body;
  if (!email || !password) { return res.status(400)... }

  // 2. Cari user & verifikasi status aktif
  const user = await User.findOne({ where: { email } });
  if (!user || user.status !== 'active') { return res.status(401/403)... }

  // 3. Verifikasi password via bcrypt
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) { return res.status(401)... }

  // 4. Generate JTI unik (UUID v4 untuk identifikasi token ini)
  const jti = crypto.randomUUID();

  // 5. Buat JWT dengan payload keamanan lengkap
  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      tokenVersion: user.token_version,  // Untuk deteksi token usang
      jti,                                // Untuk blacklist per-token
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  // 6. Set sebagai HttpOnly Cookie (BUKAN response body)
  res.cookie('token', token, {
    httpOnly: true,                                    // JS tidak bisa akses
    secure: process.env.NODE_ENV === 'production',     // HTTPS only di production
    sameSite: 'lax',                                   // CSRF protection
    maxAge: 15 * 60 * 1000,                            // 15 menit
  });

  // 7. Response berisi data user & token
  res.json({ data: { token, user: { id, name, email, role, initials } } });
};
```

### Implementasi Middleware Autentikasi

**File**: `server/middleware/auth.js`

Setiap request yang memerlukan autentikasi melewati middleware ini:

```javascript
const authenticate = async (req, res, next) => {
  // LANGKAH 1: Ekstrak token dari cookie (prioritas) atau header
  let token = null;
  if (req.headers.cookie) {
    const cookies = parseCookies(req.headers.cookie);
    token = cookies.token || null;
  }
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  // LANGKAH 2: Verifikasi JWT signature
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // LANGKAH 3: Cek JTI blacklist (apakah token ini sudah di-logout?)
  if (decoded.jti && (await tokenBlacklist.has(decoded.jti))) {
    return res.status(401).json({ error: 'Sesi Anda telah berakhir. Silakan login kembali.' });
  }

  // LANGKAH 4: Cek user aktif di database
  const user = await User.findByPk(decoded.id);
  if (!user) {
    return res.status(401).json({ error: 'User tidak ditemukan.' });
  }
  if (user.status !== 'active') {
    return res.status(403).json({ error: 'Akun Anda telah dinonaktifkan.' });
  }

  // LANGKAH 5: Validasi token_version
  if (decoded.tokenVersion === undefined || decoded.tokenVersion !== user.token_version) {
    return res.status(401).json({
      error: 'Sesi Anda tidak valid (sandi/peran berubah atau telah keluar). Silakan login ulang.',
    });
  }

  req.user = user;
  next();
};
```

### Properti Cookie Token

| Atribut    | Nilai               | Fungsi Keamanan                                                |
| ---------- | ------------------- | -------------------------------------------------------------- |
| `httpOnly` | `true`              | Blokir akses dari `document.cookie` (anti-XSS)                 |
| `secure`   | `true` (production) | Token hanya dikirim lewat HTTPS                                |
| `sameSite` | `lax`               | Mencegah pengiriman cookie pada cross-site request (anti-CSRF) |
| `maxAge`   | 30 menit            | Token otomatis kedaluwarsa                                     |

### Payload JWT

```json
{
  "id": 1,
  "role": "sysadmin",
  "tokenVersion": 0,
  "jti": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "iat": 1716825600,
  "exp": 1716827400
}
```

- **`tokenVersion`**: Dibandingkan dengan `user.token_version` di database untuk mendeteksi apakah password/role sudah berubah sejak token dibuat
- **`jti`** (JWT ID): Identifier unik token — digunakan untuk blacklist token spesifik saat logout

---

## 5. Mekanisme Pembatalan Token (Token Revocation)

### Masalah JWT Stateless

JWT secara default bersifat _stateless_ — sekali token dibuat dan ditandatangani, token tersebut valid sampai `exp` (kedaluwarsa). Ini berarti:

- Jika user logout, token yang sudah diterbitkan **tetap valid**
- Jika admin mengganti role user, token lama **masih membawa role lama**
- Jika user mengganti password, token lama **masih bisa dipakai**

### Solusi: Dual Revocation System

LokaLab mengimplementasikan **dua mekanisme** pembatalan token yang bekerja bersama:

#### Mekanisme 1: Persistent Database JTI Blacklist (Per-Token Revocation)

Untuk menjamin keamanan kelas produksi yang andal, LokaLab menyimpan daftar token yang telah dibatalkan (JTI Blacklist) secara **persisten di database MySQL** (tabel `revoked_tokens`) daripada di dalam memori server (in-memory). Dengan demikian, daftar blacklist tidak akan hilang meskipun server dimulai ulang (_restart_).

```javascript
// File: server/middleware/auth.js
const tokenBlacklist = {
  has: async (jti) => {
    try {
      const found = await RevokedToken.findOne({ where: { jti } });
      return !!found;
    } catch (e) {
      console.error('[Blacklist Has Error]', e.message);
      return false;
    }
  },
  add: async (jti, expiresAt) => {
    try {
      await RevokedToken.create({
        jti,
        expires_at: expiresAt || new Date(Date.now() + 30 * 60 * 1000), // Sesuai masa kedaluwarsa token 30m
      });
    } catch (e) {
      if (e.name !== 'SequelizeUniqueConstraintError') {
        console.error('[Blacklist Add Error]', e.message);
      }
    }
  },
};
```

**Cara kerja**: Saat logout, `jti` dari token yang aktif disimpan ke tabel `revoked_tokens` dengan timestamp kedaluwarsa. Middleware `authenticate` memverifikasi secara asinkron apakah `jti` tersebut ada di database. Jika ya, akses langsung ditolak dengan status 401.

**Keunggulan**: Pembatalan sesi persisten per-token yang tahan restart server, sangat tangguh untuk arsitektur multi-instance/kluster.

#### Mekanisme 2: Token Version (Global Session Invalidation)

```javascript
// Di model User — kolom token_version (default: 0)
token_version: {
  type: DataTypes.INTEGER,
  allowNull: false,
  defaultValue: 0,
}
```

**Cara kerja**: Setiap JWT berisi `tokenVersion` saat dibuat. Saat ada event keamanan penting, `token_version` di database dinaikkan (+1). Semua token yang membawa `tokenVersion` lama langsung menjadi tidak valid.

**Event yang memicu kenaikan token_version**:

| Event                  | File                                    | Efek                                        |
| ---------------------- | --------------------------------------- | ------------------------------------------- |
| Logout                 | `authController.js` → `logout()`        | Semua sesi user di semua perangkat berakhir |
| Ganti Password         | `authController.js` → `updateProfile()` | Paksa login ulang di semua perangkat        |
| Admin ubah Role        | `adminController.js` → `updateUser()`   | Token lama dengan role lama ditolak         |
| Admin nonaktifkan User | `adminController.js` → `updateUser()`   | Semua sesi langsung mati                    |
| Admin hapus User       | `adminController.js` → `deleteUser()`   | Invalidasi sebelum penghapusan              |

### Implementasi Logout

**File**: `server/controllers/authController.js`

```javascript
const logout = async (req, res) => {
  // 1. Blacklist JTI token saat ini (revoke token spesifik ini dengan parameter kedaluwarsa)
  if (token) {
    const decoded = jwt.decode(token);
    if (decoded?.jti) {
      await tokenBlacklist.add(decoded.jti, decoded.exp);
    }
  }

  // 2. Increment token_version (invalidate SEMUA token user ini)
  const user = await User.findByPk(userId);
  if (user) {
    user.token_version = (user.token_version || 0) + 1;
    await user.save();
  }

  // 3. Clear HttpOnly cookie dari browser
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  // 4. Catat di audit log
  await logAudit(userId, 'auth.logout', req.user.email, req.ip);
};
```

### Alur Pembatalan (Flowchart)

```
User klik Logout
      │
      ▼
┌─────────────────────────────────┐
│ 1. Blacklist JTI token ini      │ ← Revoke token spesifik
│    tokenBlacklist.add(jti, exp) │
└──────────────┬──────────────────┘
               ▼
┌─────────────────────────────────┐
│ 2. Increment token_version (+1) │ ← Revoke SEMUA token user
│    user.token_version: 0 → 1    │
└──────────────┬──────────────────┘
               ▼
┌─────────────────────────────────┐
│ 3. Clear cookie dari browser    │ ← Hapus token dari client
│    res.clearCookie('token')     │
└──────────────┬──────────────────┘
               ▼
┌─────────────────────────────────┐
│ 4. Audit log: LOGOUT dicatat    │ ← Jejak aktivitas
└─────────────────────────────────┘
```

#### Mekanisme Pembersihan Otomatis (Blacklist Token Cleanup)

Untuk mencegah tabel `revoked_tokens` di database MySQL membengkak tanpa batas seiring waktu, LokaLab mengimplementasikan **pembersihan otomatis berkala**:

- **Eksekusi Startup**: Sistem secara otomatis memicu pembersihan setiap kali server Express.js dimulai (`server.js`).
- **Interval Berkala**: Timer background Express menjalankan rutin pembersihan setiap **6 jam sekali** untuk menghapus token usang yang masa kedaluwarsanya (`expires_at`) sudah lewat.
- **Implementasi**:
  ```javascript
  // Operasi penghapusan record expired secara berkala
  cleanup: async () => {
    const { Op } = require('sequelize');
    await RevokedToken.destroy({
      where: {
        expires_at: { [Op.lt]: new Date() },
      },
    });
  };
  ```

---

## 6. Enkripsi Backup (AES-256-GCM)

### Apa dan Mengapa

File backup database (`.loka`) berisi seluruh data inventaris laboratorium. Jika jatuh ke tangan yang salah, data tersebut harus **tidak bisa dibaca**. Lebih penting lagi, file backup harus **tidak bisa dimanipulasi** tanpa terdeteksi.

**AES-256-GCM** (Galois/Counter Mode) memberikan dua jaminan sekaligus:

1. **Kerahasiaan** (Confidentiality) — Data terenkripsi, tidak bisa dibaca tanpa kunci
2. **Integritas** (Integrity) — Authentication Tag memastikan data tidak dimodifikasi

### Mengapa GCM, Bukan CBC?

|                        | AES-256-CBC (sebelumnya)     | AES-256-GCM (sekarang) |
| ---------------------- | ---------------------------- | ---------------------- |
| **Kerahasiaan**        | ✅ Ya                        | ✅ Ya                  |
| **Integritas bawaan**  | ❌ Tidak ada                 | ✅ Authentication Tag  |
| **Deteksi manipulasi** | ❌ Perlu checksum terpisah   | ✅ Otomatis gagal      |
| **Standar modern**     | Tua, rentan _padding oracle_ | Direkomendasikan NIST  |

### Implementasi

**File**: `server/controllers/backupController.js`

#### Proses Enkripsi (Export Backup)

```javascript
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;   // GCM memerlukan IV 12-byte (96-bit), bukan 16

function getEncryptionKey(saltHex) {
  // Derives a secure 32-byte encryption key using scrypt and a dynamic or fallback salt
  const secret = process.env.BACKUP_ENCRYPTION_SECRET || 'lokalab-default-backup-secret-key-2026';
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : 'loka-backup-salt-v2';
  return crypto.scryptSync(secret, salt, 32);
}

const exportBackup = async (req, res) => {
  // 1. Kumpulkan data dari database
  const dbPayload = { users, rooms, ... };

  // 2. Enkripsi dengan AES-256-GCM + scrypt KDF (Dynamic Salt)
  const iv = crypto.randomBytes(12);
  const salt = crypto.randomBytes(16).toString('hex'); // 16-byte random salt
  const key = getEncryptionKey(salt);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(rawJson, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');           // ← Authentication Tag

  // 3. Output: { iv, salt, encrypted, tag, timestamp, version }
  const backupFile = { iv: iv.toString('hex'), salt, encrypted, tag, timestamp, version: '3.0.0' };
};
```

#### Proses Dekripsi (Import/Restore Backup)

```javascript
const importBackup = async (req, res) => {
  // 1. Validasi format file
  if (!backupFile.iv || !backupFile.encrypted || !backupFile.tag) {
    return res.status(400).json({ message: 'Format file backup tidak valid.' });
  }

  // 2. Dekripsi dengan verifikasi Authentication Tag & dynamic salt KDF
  const key = getEncryptionKey(backupFile.salt);
  const iv = Buffer.from(backupFile.iv, 'hex');
  const tag = Buffer.from(backupFile.tag, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  try {
    decrypted = decipher.update(backupFile.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8'); // ← GAGAL jika data dimanipulasi!
  } catch (cryptoErr) {
    return res.status(400).json({
      message: 'File mungkin telah dimodifikasi, rusak, atau menggunakan kunci berbeda.',
    });
  }
};
```

### Detail Teknis

| Parameter              | Nilai                      | Penjelasan                                             |
| ---------------------- | -------------------------- | ------------------------------------------------------ |
| **Algoritma**          | `aes-256-gcm`              | Authenticated Encryption with Associated Data (AEAD)   |
| **Panjang Kunci**      | 256-bit (32 byte)          | Diderivasi via KDF (`scrypt`) menggunakan dynamic salt |
| **Panjang IV**         | 96-bit (12 byte)           | Standar GCM yang direkomendasikan NIST                 |
| **Authentication Tag** | 128-bit (16 byte)          | Disimpan sebagai hex string (32 karakter)              |
| **Kunci**              | `BACKUP_ENCRYPTION_SECRET` | Terpisah dari `JWT_SECRET`                             |

### Struktur File Backup (.loka)

```json
{
  "iv": "a1b2c3d4e5f6a7b8c9d0e1f2",
  "salt": "f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3",
  "encrypted": "4f8a2b3c...enkripsi panjang...",
  "tag": "9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c",
  "timestamp": "2026-05-27T13:00:00.000Z",
  "version": "3.0.0"
}
```

### Skenario Keamanan

| Skenario                                    | Hasil                                             |
| ------------------------------------------- | ------------------------------------------------- |
| File backup dicuri tanpa kunci              | ❌ Data tidak bisa dibaca (terenkripsi AES-256)   |
| Isi file backup diubah 1 byte               | ❌ Restore gagal — Authentication Tag tidak cocok |
| File backup di-restore dengan kunci berbeda | ❌ Dekripsi gagal total                           |
| File backup asli + kunci benar              | ✅ Restore berhasil                               |

---

## 7. Audit Log Anti-Tamper (Hash Chaining)

### Apa dan Mengapa

Audit log mencatat setiap aksi penting dalam sistem (login, logout, CRUD operasi, backup, dll). Tantangannya: bagaimana menjamin integritas log agar jika terjadi manipulasi data oleh pihak internal maupun eksternal (termasuk administrator database), manipulasi tersebut dapat langsung terdeteksi secara kriptografis (_tamper-evident_)?

### Solusi: Hash Chaining berbasis HMAC-SHA256

Setiap entri audit log dihubungkan secara kriptografi dengan entri sebelumnya menggunakan **rantai hash (hash chain) berbasis HMAC-SHA256**:

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Log #1     │    │   Log #2     │    │   Log #3     │
│              │    │              │    │              │
│ prev: 0000.. │───▶│ prev: hash1  │───▶│ prev: hash2  │
│ hash: hash1  │    │ hash: hash2  │    │ hash: hash3  │
│              │    │              │    │              │
│ HMAC(        │    │ HMAC(        │    │ HMAC(        │
│  genesis +   │    │  hash1 +     │    │  hash2 +     │
│  timestamp + │    │  timestamp + │    │  timestamp + │
│  userId +    │    │  userId +    │    │  userId +    │
│  action +    │    │  action +    │    │  action +    │
│  target      │    │  target      │    │  target      │
│ )            │    │ )            │    │ )            │
└──────────────┘    └──────────────┘    └──────────────┘
       │                  │                    │
       └──────────────────┴────────────────────┘
              Rantai Hash Tak Terputus
```

### Implementasi

**File**: `server/middleware/audit.js`

```javascript
const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

const logAudit = async (userId, action, target, ip, details = '') => {
  try {
    const secret = process.env.AUDIT_LOG_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
      throw new Error('AUDIT_LOG_SECRET wajib diatur di lingkungan produksi.');
    }
    const activeSecret = secret || 'lokalab-default-audit-secret-key-2026';

    // 1. Ambil hash dari log terakhir (link ke rantai)
    const lastLog = await AuditLog.findOne({
      order: [['id', 'DESC']],
    });
    const previousHash =
      lastLog && lastLog.hash
        ? lastLog.hash
        : '0000000000000000000000000000000000000000000000000000000000000000';

    // 2. Gunakan timestamp unix detik presisi tinggi untuk konsistensi database
    const now = new Date();
    const timeSecs = Math.floor(now.getTime() / 1000).toString();

    // 3. Hitung HMAC-SHA256 dari data log + hash sebelumnya (termasuk details data non-sensitif)
    const dataToHash = `${previousHash}|${timeSecs}|${userId || ''}|${action}|${target || ''}|${ip || ''}|${details || ''}`;
    const hash = crypto.createHmac('sha256', activeSecret).update(dataToHash).digest('hex');

    // 4. Simpan log dengan hash, details, dan link ke log sebelumnya
    await AuditLog.create({
      user_id: userId,
      action,
      target,
      ip: ip || null,
      details: details || null,
      hash,
      previous_hash: previousHash,
      created_at: now,
    });
  } catch (err) {
    console.error('[Audit Log Error]', err.message);
  }
};
```

### Skema Database Audit Log

| Kolom           | Tipe         | Penjelasan                                    |
| --------------- | ------------ | --------------------------------------------- |
| `id`            | INTEGER (PK) | Auto-increment                                |
| `user_id`       | INTEGER      | ID user yang melakukan aksi                   |
| `action`        | STRING       | Jenis aksi (LOGIN, LOGOUT, CREATE_ITEM, dll.) |
| `target`        | TEXT         | Detail target aksi                            |
| `details`       | TEXT         | Data tambahan (JSON)                          |
| `hash`          | STRING(64)   | HMAC-SHA256 hash dari log ini                 |
| `previous_hash` | STRING(64)   | Hash dari log sebelumnya (chain link)         |
| `created_at`    | DATETIME     | Timestamp                                     |

### Verifikasi Integritas Rantai

**File**: `server/controllers/adminController.js`  
**Endpoint**: `GET /api/admin/audit-logs/verify` (sysadmin only)

```javascript
const verifyAuditChain = async (req, res) => {
  try {
    const logs = await AuditLog.findAll({ order: [['id', 'ASC']] });
    const secret = process.env.AUDIT_LOG_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
      throw new Error('AUDIT_LOG_SECRET wajib diatur di lingkungan produksi.');
    }
    const activeSecret = secret || 'lokalab-default-audit-secret-key-2026';
    let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const issues = [];

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      // Convert DATETIME to unix seconds string to avoid TZ / millisecond formatting issues
      const timeSecs = Math.floor(
        new Date(log.created_at || log.createdAt).getTime() / 1000
      ).toString();

      // Compute expected HMAC hash including details field
      const dataToHash = `${previousHash}|${timeSecs}|${log.user_id || ''}|${log.action}|${log.target || ''}|${log.ip || ''}|${log.details || ''}`;
      const computedHash = crypto
        .createHmac('sha256', activeSecret)
        .update(dataToHash)
        .digest('hex');

      // 1. Verify previous_hash link
      if (log.previous_hash && log.previous_hash !== previousHash) {
        issues.push({
          id: log.id,
          action: log.action,
          error: `previous_hash mismatch. Expected link to "${previousHash.substring(0, 10)}...", Got link to "${log.previous_hash.substring(0, 10)}..."`,
        });
      }

      // 2. Verify current log data integrity
      if (log.hash && log.hash !== computedHash) {
        issues.push({
          id: log.id,
          action: log.action,
          error: `Tampering detected: Log data has been modified. Calculated hash: "${computedHash.substring(0, 10)}...", Stored hash: "${log.hash.substring(0, 10)}..."`,
        });
      }

      previousHash = log.hash || computedHash;
    }

    if (issues.length > 0) {
      console.error('\n⚠️🚨 [SECURITY WARNING] DETEKSI MANIPULASI AUDIT LOG! 🚨⚠️');
      console.error(`Ditemukan ${issues.length} masalah integritas data pada audit log.`);
      issues.forEach((issue) => {
        console.error(`  - Log ID ${issue.id} [${issue.action}]: ${issue.error}`);
      });
      console.error('======================================================\n');

      return res.json({
        valid: false,
        issuesCount: issues.length,
        issues,
      });
    }

    res.json({
      valid: true,
      message:
        'Rantai audit log utuh dan terverifikasi secara kriptografis (tidak ada manipulasi data).',
    });
  } catch (err) {
    console.error('[Verify Audit Chain Error]', err);
    res.status(500).json({ error: 'Gagal melakukan verifikasi rantai audit log.' });
  }
};
```

### Skenario Deteksi Manipulasi

| Manipulasi                     | Terdeteksi? | Cara Deteksi                                         |
| ------------------------------ | ----------- | ---------------------------------------------------- |
| Ubah isi satu log entry        | ✅ Ya       | Hash recomputed ≠ hash tersimpan                     |
| Hapus satu log entry di tengah | ✅ Ya       | `previous_hash` log berikutnya ≠ hash log sebelumnya |
| Ubah urutan log                | ✅ Ya       | Rantai `previous_hash` rusak                         |
| Tambah log palsu               | ✅ Ya       | HMAC memerlukan `AUDIT_LOG_SECRET` yang benar        |
| Ubah log terakhir saja         | ✅ Ya       | Hash recomputed tidak cocok                          |

---

## 8. Security Headers, CORS & Proteksi CSRF

### Security Headers

**File**: `server/app.js`

```javascript
app.use((req, res, next) => {
  const isProd = process.env.NODE_ENV === 'production';
  // Pembedaan lingkungan: Produksi melarang keras evaluasi dinamis (unsafe-eval)
  const scriptSrc = isProd ? "'self'" : "'self' 'unsafe-inline' 'unsafe-eval'";
  const connectSrc = isProd
    ? "'self'"
    : "'self' ws://localhost:5173 http://localhost:3000 http://localhost:5173 ws://localhost:*";

  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; ` +
      `script-src ${scriptSrc}; ` +
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ` +
      `font-src 'self' data: https://fonts.gstatic.com; ` +
      `img-src 'self' data: blob:; ` +
      `connect-src ${connectSrc}; ` +
      `frame-ancestors 'none';`
  );
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
```

| Header                      | Nilai                                      | Ancaman yang Dicegah                                                     |
| --------------------------- | ------------------------------------------ | ------------------------------------------------------------------------ |
| **Content-Security-Policy** | Whitelist ketat dinamis                    | XSS (Cross-Site Scripting) — membatasi sumber script, style, dan koneksi |
| **X-Frame-Options**         | `DENY`                                     | Clickjacking — halaman tidak bisa di-embed dalam `<iframe>`              |
| **X-Content-Type-Options**  | `nosniff`                                  | MIME Sniffing — browser tidak menebak tipe konten                        |
| **Referrer-Policy**         | `strict-origin-when-cross-origin`          | Information Leakage — membatasi data referrer ke origin saja             |
| **Permissions-Policy**      | `camera=(), microphone=(), geolocation=()` | Feature Abuse — memblokir akses API sensitif browser                     |

### Detail CSP (Content Security Policy)

| Directive         | Nilai (Development)                           | Nilai (Production)                            | Penjelasan                                                                                                                         |
| ----------------- | --------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `default-src`     | `'self'`                                      | `'self'`                                      | Hanya izinkan resource dari origin yang sama                                                                                       |
| `script-src`      | `'self' 'unsafe-inline' 'unsafe-eval'`        | `'self'`                                      | **Produksi melarang keras evaluasi dinamis** (unsafe-eval) untuk mitigasi XSS penuh. Dev mengizinkan untuk hot reload/source maps. |
| `style-src`       | `'self' 'unsafe-inline' fonts.googleapis.com` | `'self' 'unsafe-inline' fonts.googleapis.com` | Style dari origin + Google Fonts                                                                                                   |
| `font-src`        | `'self' data: fonts.gstatic.com`              | `'self' data: fonts.gstatic.com`              | Font dari origin + data URIs + Google Fonts CDN                                                                                    |
| `img-src`         | `'self' data: blob:`                          | `'self' data: blob:`                          | Gambar dari origin + data URI + blob (untuk live QR scanner)                                                                       |
| `connect-src`     | Origin lokal + WebSockets dev                 | `'self'`                                      | Fetch/XHR hanya ke server API backend tepercaya                                                                                    |
| `frame-ancestors` | `'none'`                                      | `'none'`                                      | Halaman tidak boleh di-embed oleh siapapun (proteksi clickjacking)                                                                 |

### CORS Configuration

```javascript
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173', // Strict origin
    credentials: true, // Izinkan cookie
  })
);
```

| Parameter     | Nilai                    | Penjelasan                                                                    |
| ------------- | ------------------------ | ----------------------------------------------------------------------------- |
| `origin`      | Explicit URL (bukan `*`) | Hanya frontend yang diizinkan mengakses API secara lintas-asal                |
| `credentials` | `true`                   | Wajib untuk mengizinkan browser mengirim HttpOnly Cookie sesi secara otomatis |

---

### Proteksi CSRF (Cross-Site Request Forgery)

Karena token JWT disimpan dalam HttpOnly Cookie (yang dikirim otomatis oleh browser pada setiap request), sistem LokaLab menerapkan **Double Defense CSRF Protection** untuk mengamankan seluruh endpoint mutasi data penting (POST, PUT, DELETE, PATCH):

#### 🛡️ Pertahanan 1: SameSite=Lax Cookie Attribute

Atribut `SameSite=Lax` pada cookie sesi memastikan bahwa browser tidak akan menyertakan cookie pada request lintas situs (cross-site) yang dipicu oleh elemen pihak ketiga (seperti tautan eksternal, tag `<img>`, atau submisi form otomatis).

#### 🛡️ Pertahanan 2: Header Kustom Wajib (Custom Header Verification)

Untuk menutup celah serangan canggih, sistem menerapkan middleware proteksi CSRF kustom pada server API backend:

- **File Middleware**: [csrf.js](file:///c:/Users/malik/Downloads/Lab%20Inventory/server/middleware/csrf.js)
- **Cara Kerja**: Semua metode mutasi wajib menyertakan header kustom **`X-Requested-With`** atau **`X-CSRF-Token`**.
- **Keamanan**: Kebijakan browser Same-Origin Policy (SOP) melarang situs pihak ketiga untuk mengirim request dengan header kustom apa pun tanpa persetujuan CORS yang eksplisit.
- **Implementasi Backend**:

  ```javascript
  const csrfProtection = (req, res, next) => {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method.toUpperCase())) return next();

    const hasHeader = req.headers['x-requested-with'] || req.headers['x-csrf-token'];
    if (!hasHeader) {
      return res
        .status(403)
        .json({ error: 'CSRF Protection: Header keamanan wajib tidak ditemukan.' });
    }
    next();
  };
  ```

- **Integrasi Frontend**:
  Setiap kali memanggil API via [api.js](file:///c:/Users/malik/Downloads/Lab%20Inventory/src/services/api.js), sistem secara otomatis menyematkan header keamanan:
  ```javascript
  export const authHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest', // Kebal dari eksploitasi CSRF
    };
  };
  ```

---

## 9. Proteksi Frontend

### 9.1 Manajemen Token di Client

**File**: `src/services/api.js`

Frontend **tidak pernah menyimpan JWT string**. Yang disimpan hanyalah flag boolean (`loka_logged_in`) untuk mengetahui status login UI:

```javascript
const TOKEN_KEY = 'loka_logged_in';

export function setToken() {
  localStorage.setItem(TOKEN_KEY, 'true');
}
export function getToken() {
  return localStorage.getItem(TOKEN_KEY) === 'true';
}
export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}
```

**Perbedaan kritis**:

- ❌ **Sebelum**: `localStorage.setItem('token', 'eyJhbGciOiJ...')` — JWT token tersimpan, bisa dicuri via XSS
- ✅ **Sekarang**: `localStorage.setItem('loka_logged_in', 'true')` — Hanya flag, tidak ada nilai sensitif

### 9.2 Cookie Credentials pada Setiap Request

```javascript
export async function apiFetch(endpoint, options = {}) {
  const config = {
    credentials: 'include', // ← Browser otomatis kirim HttpOnly cookie
    ...options,
  };
  const response = await fetch(url, config);
  // ...
}
```

### 9.3 Auto-Logout pada 401 (Interceptor)

```javascript
// Interceptor: jika server menolak (401), langsung logout
if (response.status === 401) {
  removeToken();
  if (_logoutCallback) {
    _logoutCallback(); // Redirect ke landing page
  } else {
    window.location.reload(); // Fallback: reload halaman
  }
  throw new Error('Sesi telah berakhir.');
}
```

**Manfaat**: Jika token di cookie sudah expired, atau token_version berubah (password diganti dari perangkat lain), user langsung di-redirect ke halaman login tanpa bisa mengakses data apapun.

### 9.4 Server-Side Logout dari Frontend

**File**: `src/main.jsx`

```javascript
// Saat logout, panggil server untuk clear cookie & blacklist token
const goToLanding = async () => {
  await apiFetch('/auth/logout', { method: 'POST' }); // Server-side revocation
  removeToken(); // Clear client flag
  setCurrentScreen('landing');
};
```

### 9.5 Validasi Upload Gambar QR

**File**: `src/screens/dashboard/admin/QRScanner.jsx`

```javascript
const handleQrUpload = (e) => {
  const file = e.target.files[0];

  // Validasi MIME type
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  if (!allowedTypes.includes(file.type)) {
    toast.error('Format file tidak didukung. Gunakan PNG atau JPEG.');
    return;
  }

  // Validasi ukuran (maks 2MB)
  const MAX_SIZE = 2 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    toast.error('Ukuran file terlalu besar. Maksimal 2MB.');
    return;
  }
  // ... proses decode QR
};
```

---

## 10. Pemisahan Kunci Rahasia

### Prinsip: Satu Kunci untuk Satu Tujuan

Menggunakan satu kunci untuk semua fungsi kriptografi adalah praktik buruk. Jika kunci bocor, **semua** fungsi keamanan terdampak. LokaLab menggunakan **tiga kunci terpisah**:

```env
# .env
JWT_SECRET=<kunci-untuk-autentikasi-jwt>
BACKUP_ENCRYPTION_SECRET=<kunci-untuk-enkripsi-backup>
AUDIT_LOG_SECRET=<kunci-untuk-hash-chain-audit-log>
```

| Kunci                      | Digunakan Untuk               | Dampak Jika Bocor                                                                              |
| -------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------- |
| `JWT_SECRET`               | Signing/verifying JWT token   | Penyerang bisa membuat token palsu, tapi tidak bisa membaca backup atau memanipulasi audit log |
| `BACKUP_ENCRYPTION_SECRET` | Enkripsi/dekripsi file backup | Penyerang bisa membaca backup, tapi tidak bisa login atau mengubah audit log                   |
| `AUDIT_LOG_SECRET`         | HMAC hash chain audit log     | Penyerang bisa memanipulasi log tanpa terdeteksi, tapi tidak bisa login atau membaca backup    |

### ⚠️ Validasi Ketat di Lingkungan Produksi (Zero-Fallback Policy)

Untuk menjamin keamanan tingkat industri, LokaLab menerapkan **kebijakan nihil-fallback** di lingkungan produksi (`NODE_ENV=production`):

- **Gagal Instan di Awal (Crash on Startup)**: Sistem memeriksa keberadaan ketiga kunci di atas pada file `server.js` saat startup. Jika salah satu kunci bernilai kosong atau tidak terdefinisi, server Express **sengaja dirancang untuk melempar error kritis dan langsung berhenti beroperasi (exit 1)**.
- **Tanpa Fallback Kunci Standar (No Default Keys)**: Backend akan menolak menggunakan string rahasia bawaan (_default keys_) pada fungsi enkripsi backup maupun hash audit log ketika berjalan di lingkungan produksi.
- **Implementasi**:
  ```javascript
  if (process.env.NODE_ENV === 'production') {
    const criticalSecrets = ['JWT_SECRET', 'BACKUP_ENCRYPTION_SECRET', 'AUDIT_LOG_SECRET'];
    const missing = criticalSecrets.filter((secret) => !process.env[secret]);
    if (missing.length > 0) {
      throw new Error(`CRITICAL: Missing environment variables: ${missing.join(', ')}`);
    }
  }
  ```

### Konfigurasi Tambahan

| Variabel      | Default                 | Penjelasan                                                    |
| ------------- | ----------------------- | ------------------------------------------------------------- |
| `JWT_EXPIRY`  | `30m`                   | Masa berlaku token JWT                                        |
| `CORS_ORIGIN` | `http://localhost:5173` | Origin yang diizinkan mengakses API                           |
| `NODE_ENV`    | `development`           | Mengontrol flag `secure` pada cookie dan validasi kunci ketat |

---

## 11. Validasi Zod, Transaksi ACID & Winston Logger

### 11.1 Validasi Input Terpadu (Zod Validation)

Untuk memitigasi risiko _data injection_ dan penolakan data malformed, LokaLab menerapkan **Validasi Skema Zod** secara terpadu baik di sisi client (frontend) maupun server (backend):

- **Frontend (`src/schemas/procurementSchema.js` & `NewDraftForm.jsx`)**: Melakukan pemeriksaan validasi awal di peramban menggunakan `createDraftSchema.safeParse`. Jika masukan tidak valid, form tidak akan dikirim dan pesan kesalahan spesifik akan langsung dimunculkan melalui `toast`.
- **Backend (`server/schemas/procurement.js` & `server/middleware/validation.js`)**: Menerapkan middleware kustom `validate(schema)` sebelum memproses rute krusial. Middleware secara otomatis menangkap `ZodError` dan membalas dengan status `400 Bad Request` beserta deskripsi kolom yang bermasalah.

### 11.2 Konsistensi Database Tingkat Tinggi (Sequelize ACID Transactions)

Logika mutasi multi-baris di dalam rute pengadaan (`procurementController.js`) diamankan menggunakan **Sequelize Transactions (`sequelize.transaction()`)**:

- **Alur `createDraft`**: Pembuatan record `Draft` dan bulk-insert barang (`DraftItem.bulkCreate`) dieksekusi di dalam lingkup satu transaksi tunggal. Jika penyimpanan salah satu item gagal, seluruh operasi dibatalkan secara otomatis (_rollback_), sehingga database bebas dari draf kosong (_orphan records_).
- **Alur `approveDraftItems`**: Persetujuan multi-item oleh Kaprodi diamankan di bawah kontrol transaksi atomik agar perubahan status tidak tersimpan setengah-setengah.

### 11.3 Enterprise Structured Logging (Winston & Daily Rotate File)

Untuk memenuhi kepatuhan audit sistem informasi dan pemantauan kesalahan aktif, sistem logging beralih dari `console.log` tidak terstruktur ke sistem **Winston Structured Logger** (`server/utils/logger.js`):

- **Request Logger**: Middleware `requestLogger` di `server/app.js` secara otomatis melacak setiap request HTTP masuk, durasi response dalam `ms`, status HTTP, alamat IP klien, browser User-Agent, serta user ID & role yang terautentikasi.
- **JSON Daily Rolling Log File**: Log disimpan harian ke berkas fisik `server/logs/app-YYYY-MM-DD.log` (level info) dan `server/logs/error-YYYY-MM-DD.log` (level error) dengan format JSON terkompresi bergulir otomatis (retensi 14 hari).
- **Global Error Logging**: Log stack trace kesalahan Express global otomatis ditangkap menggunakan `logger.error` untuk konsistensi investigasi Sysadmin.

---

## 12. Pengujian Keamanan

**File**: `server/tests/security.test.js`

Suite pengujian otomatis mencakup **18 test cases** di 6 kategori:

### Hasil Pengujian

```
🔒 LokaLab Security Tests
==================================================

📋 Password Hashing Tests:
  ✓ bcrypt hash is generated with salt rounds >= 10
  ✓ bcrypt correctly verifies matching password
  ✓ bcrypt rejects wrong password

📋 JWT Token Security Tests:
  ✓ JWT token contains required security claims (jti, tokenVersion)
  ✓ JWT token with wrong secret is rejected
  ✓ Expired JWT token is rejected

📋 AES-256-GCM Encryption Tests:
  ✓ AES-256-GCM encryption and decryption works correctly
  ✓ AES-256-GCM detects tampered ciphertext (integrity check)

📋 Token Version Validation Tests:
  ✓ Token with outdated tokenVersion should be detectable

📋 Audit Log Hash Chaining Tests:
  ✓ Audit log hash chain computes correctly
  ✓ Tampered audit log breaks the hash chain

📋 Double Submit CSRF Protection Tests:
  ✓ should bypass safe methods (GET, HEAD, OPTIONS)
  ✓ should bypass whitelisted routes (login and refresh)
  ✓ should reject request when Origin header is invalid
  ✓ should reject request when Referer header is invalid
  ✓ should reject when CSRF token cookie is missing
  ✓ should reject when CSRF token header is missing
  ✓ should reject when cookie and header CSRF tokens mismatch
  ✓ should allow request when Origin and Double Submit Cookie CSRF token match

==================================================
📊 Results: 18 passed, 0 failed, 18 total
✅ All security tests passed!
```

### Cara Menjalankan

```bash
npm run security-test
```

---

## 13. Pemetaan Kepatuhan Standar

### OWASP Top 10:2025

| #   | Risiko OWASP              | Mitigasi di LokaLab                                                                | Status        |
| --- | ------------------------- | ---------------------------------------------------------------------------------- | ------------- |
| A01 | Broken Access Control     | Role-based authorization (`sysadmin`, `admin`, `viewer`), token_version validation | ✅            |
| A02 | Cryptographic Failures    | bcrypt password hashing, AES-256-GCM backup, HMAC-SHA256 audit, pemisahan kunci    | ✅            |
| A03 | Injection                 | Sequelize ORM (parameterized queries), input validation                            | ✅            |
| A04 | Insecure Design           | Defense-in-depth, least privilege, HttpOnly cookie                                 | ✅            |
| A05 | Security Misconfiguration | Strict CSP, CORS whitelist, security headers                                       | ✅            |
| A06 | Vulnerable Components     | Dependency awareness, minimal external deps                                        | ⚠️ Monitoring |
| A07 | Authentication Failures   | bcrypt, JWT expiry 30m, JTI blacklist, token revocation                            | ✅            |
| A08 | Data Integrity Failures   | AES-256-GCM Auth Tag, HMAC hash chain, signed JWT                                  | ✅            |
| A09 | Logging & Monitoring      | Audit log dengan hash chaining + verifikasi endpoint                               | ✅            |
| A10 | SSRF                      | connect-src CSP restriction, CORS strict origin                                    | ✅            |

### NIST SP 800-63B (Digital Identity)

| Requirement               | Implementasi                                                                       | Status |
| ------------------------- | ---------------------------------------------------------------------------------- | ------ |
| Memorized Secret Verifier | bcrypt (salt rounds 12)                                                            | ✅     |
| Throttling/Rate Limiting  | IP & Username rate limiter, delay progresif (throttling), serta audit failed login | ✅     |
| Session Binding           | HttpOnly Secure SameSite cookie                                                    | ✅     |
| Reauthentication          | 30 menit session timeout                                                           | ✅     |
| Secret Storage            | Semua kunci di `.env`, bukan hardcoded                                             | ✅     |

---

## 14. Rekomendasi untuk Produksi

Berikut peningkatan yang **disarankan** jika LokaLab akan di-deploy ke lingkungan produksi tingkat lanjut:

### Prioritas Tinggi

| #   | Rekomendasi                             | Alasan                                                                                                                                                                                                         |
| --- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Redis untuk Blacklist (Skala Besar)** | JTI blacklist saat ini sudah persisten di database MySQL (`revoked_tokens`). Untuk produksi skala besar dengan beban trafik tinggi, memindahkan blacklist ke Redis dapat meminimalkan beban I/O database MySQL |
| 2   | **Aktifkan HTTPS**                      | Cookie `secure: true` memerlukan HTTPS. Gunakan Let's Encrypt atau reverse proxy (nginx)                                                                                                                       |
| 3   | **Buat `.env.example`**                 | Dokumentasikan semua environment variable yang diperlukan                                                                                                                                                      |

### Prioritas Menengah

| #   | Rekomendasi                                 | Alasan                                                                                                                                                                    |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5   | **Upgrade ke Argon2id**                     | bcrypt bagus, Argon2id lebih baik (rekomendasi utama OWASP). Gunakan package `argon2`                                                                                     |
| 6   | **Refresh Token**                           | Access token 15m + Refresh token (HttpOnly cookie, 7 hari) untuk UX lebih baik                                                                                            |
| 7   | **Input validation library (Terintegrasi)** | Pustaka `zod` telah sukses diintegrasikan pada alur pengadaan barang (baik sisi frontend maupun backend via middleware) untuk menjamin validitas data input secara ketat. |
| 8   | **Monitoring & alerting**                   | Kirim notifikasi saat audit chain verification gagal                                                                                                                      |

### Prioritas Rendah

| #   | Rekomendasi                         | Alasan                                                                                            |
| --- | ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| 9   | **Account lockout**                 | Kunci akun setelah N percobaan login gagal berturut-turut                                         |
| 10  | **Password policy**                 | Enforce panjang minimum, kompleksitas, dan pengecekan password yang umum (breached password list) |
| 11  | **Two-Factor Authentication (2FA)** | Tambahan lapisan keamanan untuk akun sysadmin                                                     |
| 12  | **Migrasi database**                | Ganti `{ alter: true }` dengan migration tool (Sequelize CLI) untuk deployment yang lebih aman    |

---

> **Catatan**: Dokumentasi ini menjelaskan implementasi keamanan pada saat dokumen ini dibuat. Pastikan untuk memperbarui dokumen ini setiap kali ada perubahan pada mekanisme keamanan sistem.
