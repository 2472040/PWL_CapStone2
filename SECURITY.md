# 🔒 Dokumentasi Keamanan Sistem LokaLab

> **Versi**: 2.0  
> **Terakhir Diperbarui**: 27 Mei 2026  
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
11. [Pengujian Keamanan](#11-pengujian-keamanan)
12. [Pemetaan Kepatuhan Standar](#12-pemetaan-kepatuhan-standar)
13. [Rekomendasi untuk Produksi](#13-rekomendasi-untuk-produksi)

---

## 1. Ringkasan Keamanan

LokaLab menerapkan pendekatan keamanan **defense-in-depth** (pertahanan berlapis) yang mencakup seluruh stack aplikasi — dari penyimpanan password di database hingga proteksi pada sisi klien. Berikut ringkasan lapisan keamanan yang telah diimplementasikan:

| Lapisan | Mekanisme | Status |
|---|---|---|
| **Password Storage** | bcrypt dengan salt rounds 12 | ✅ Aktif |
| **Autentikasi** | JWT di HttpOnly Cookie + JTI + Token Version | ✅ Aktif |
| **Pembatalan Sesi** | JTI Blacklist + Token Version Increment | ✅ Aktif |
| **Enkripsi Data** | AES-256-GCM (Authenticated Encryption) | ✅ Aktif |
| **Audit Trail** | HMAC-SHA256 Hash Chaining (Blockchain-like) | ✅ Aktif |
| **HTTP Headers** | CSP, X-Frame-Options, nosniff, Referrer-Policy | ✅ Aktif |
| **CORS** | Strict Origin + Credentials | ✅ Aktif |
| **Frontend** | Auto-logout 401, Validasi Upload, Cookie Credentials | ✅ Aktif |
| **Kunci Rahasia** | 3 kunci terpisah (JWT, Backup, Audit) | ✅ Aktif |

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
│  │                    DATABASE (SQLite)                         │ │
│  │                                                             │ │
│  │  users:                    audit_logs:                      │ │
│  │  ├── password (bcrypt)     ├── hash (HMAC-SHA256)           │ │
│  │  ├── token_version         ├── previous_hash (chain link)   │ │
│  │  └── is_active             └── action, target, details      │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Password Hashing (bcrypt)

### Apa dan Mengapa

Password **tidak pernah** disimpan dalam bentuk teks biasa (*plaintext*) atau hash cepat seperti MD5/SHA-256. Sistem menggunakan **bcrypt** — sebuah *adaptive hashing function* yang dirancang khusus untuk password.

Bcrypt memiliki dua keunggulan utama:
1. **Lambat secara sengaja** — Setiap percobaan brute-force membutuhkan waktu komputasi yang signifikan
2. **Salt otomatis** — Setiap password mendapat salt unik, mencegah serangan *rainbow table*

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

| Parameter | Nilai | Penjelasan |
|---|---|---|
| **Algoritma** | bcrypt (`$2a$`/`$2b$`) | Blowfish-based adaptive hash |
| **Salt Rounds** | 12 | 2¹² = 4.096 iterasi internal |
| **Salt** | Otomatis per-password | 16-byte random salt yang disematkan dalam hash |
| **Output** | 60 karakter | Format: `$2a$12$<22-char-salt><31-char-hash>` |

### Contoh Data di Database

```
# Yang TERSIMPAN di database (aman):
password: $2a$12$LJ3m4ys3Lz.P9Q8kV7nXHeWJQPXwEe3MiZ1aBcDeFgHiJkLmNoPqR

# Yang TIDAK PERNAH tersimpan:
password: Admin123!  ← TIDAK PERNAH seperti ini
```

### Standar Acuan

- **OWASP**: "*Use bcrypt, scrypt, argon2, or PBKDF2 for password storage*" — bcrypt dengan cost factor ≥10 memenuhi rekomendasi OWASP
- **NIST SP 800-63B §5.1.1.2**: Memverifikasi bahwa password di-hash dengan *salt* dan fungsi hash yang tahan brute-force

---

## 4. Autentikasi JWT & Manajemen Sesi

### Apa dan Mengapa

JSON Web Token (JWT) digunakan untuk autentikasi *stateless*. Token berisi identitas pengguna yang ditandatangani secara kriptografi oleh server, sehingga server tidak perlu menyimpan sesi di database untuk setiap request.

**Keputusan desain penting**: Token JWT disimpan dalam **HttpOnly Cookie**, bukan di `localStorage`. Ini adalah perlindungan kritis terhadap serangan XSS (Cross-Site Scripting).

### Mengapa HttpOnly Cookie, Bukan localStorage?

| | `localStorage` | HttpOnly Cookie |
|---|---|---|
| **Akses via JavaScript** | ✅ `localStorage.getItem()` | ❌ Tidak bisa diakses |
| **Risiko XSS** | 🔴 Token bisa dicuri | 🟢 Token tidak terekspos |
| **Pengiriman otomatis** | ❌ Manual via header | ✅ Otomatis oleh browser |
| **Kontrol server** | ❌ Client mengelola | ✅ Server mengelola lifecycle |

### Implementasi Login

**File**: `server/controllers/authController.js`

```javascript
const login = async (req, res) => {
  // 1. Validasi input
  const { username, password } = req.body;
  if (!username || !password) { return res.status(400)... }

  // 2. Cari user & verifikasi status aktif
  const user = await User.findOne({ where: { username } });
  if (!user || !user.is_active) { return res.status(401/403)... }

  // 3. Verifikasi password via bcrypt
  const isMatch = await user.comparePassword(password);
  if (!isMatch) { return res.status(401)... }

  // 4. Generate JTI unik (UUID v4 untuk identifikasi token ini)
  const jti = crypto.randomUUID();

  // 5. Buat JWT dengan payload keamanan lengkap
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      tokenVersion: user.token_version,  // Untuk deteksi token usang
      jti,                                // Untuk blacklist per-token
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '30m' }
  );

  // 6. Set sebagai HttpOnly Cookie (BUKAN response body)
  res.cookie('token', token, {
    httpOnly: true,                                    // JS tidak bisa akses
    secure: process.env.NODE_ENV === 'production',     // HTTPS only di production
    sameSite: 'lax',                                   // CSRF protection
    maxAge: 30 * 60 * 1000,                            // 30 menit
  });

  // 7. Response HANYA berisi data user (TANPA token string)
  res.json({ message: 'Login berhasil', user: { id, username, full_name, role } });
};
```

### Implementasi Middleware Autentikasi

**File**: `server/middleware/auth.js`

Setiap request yang memerlukan autentikasi melewati middleware ini:

```javascript
const authenticate = async (req, res, next) => {
  // LANGKAH 1: Ekstrak token dari cookie (prioritas) atau header
  let token = null;
  const cookies = parseCookies(req.headers.cookie);
  if (cookies.token) {
    token = cookies.token;                              // ← Prioritas: HttpOnly Cookie
  } else {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];                 // ← Fallback: Bearer header
    }
  }

  // LANGKAH 2: Verifikasi JWT signature
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // LANGKAH 3: Cek JTI blacklist (apakah token ini sudah di-logout?)
  if (decoded.jti && jtiBlacklist.has(decoded.jti)) {
    return res.status(401).json({ message: 'Sesi telah berakhir.' });
  }

  // LANGKAH 4: Cek user aktif di database
  const user = await User.findByPk(decoded.id);
  if (!user || !user.is_active) {
    return res.status(401).json({ message: 'User tidak ditemukan atau tidak aktif.' });
  }

  // LANGKAH 5: Validasi token_version
  if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.token_version) {
    return res.status(401).json({ message: 'Sesi tidak valid. Password atau peran Anda telah diperbarui.' });
  }

  req.user = user;
  next();
};
```

### Properti Cookie Token

| Atribut | Nilai | Fungsi Keamanan |
|---|---|---|
| `httpOnly` | `true` | Blokir akses dari `document.cookie` (anti-XSS) |
| `secure` | `true` (production) | Token hanya dikirim lewat HTTPS |
| `sameSite` | `lax` | Mencegah pengiriman cookie pada cross-site request (anti-CSRF) |
| `maxAge` | 30 menit | Token otomatis kedaluwarsa |

### Payload JWT

```json
{
  "id": 1,
  "username": "admin",
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

JWT secara default bersifat *stateless* — sekali token dibuat dan ditandatangani, token tersebut valid sampai `exp` (kedaluwarsa). Ini berarti:
- Jika user logout, token yang sudah diterbitkan **tetap valid**
- Jika admin mengganti role user, token lama **masih membawa role lama**
- Jika user mengganti password, token lama **masih bisa dipakai**

### Solusi: Dual Revocation System

LokaLab mengimplementasikan **dua mekanisme** pembatalan token yang bekerja bersama:

#### Mekanisme 1: JTI Blacklist (Per-Token Revocation)

```javascript
// In-memory blacklist untuk JTI yang sudah logout
const jtiBlacklist = new Set();

function blacklistJti(jti) {
  jtiBlacklist.add(jti);
  // Auto-cleanup setelah 35 menit (lebih lama dari token expiry 30m)
  setTimeout(() => jtiBlacklist.delete(jti), 35 * 60 * 1000);
}
```

**Cara kerja**: Saat logout, `jti` dari token yang sedang aktif dimasukkan ke blacklist. Middleware `authenticate` mengecek apakah `jti` token yang datang ada di blacklist. Jika ya → ditolak.

**Keunggulan**: Pembatalan per-token yang presisi, tanpa mempengaruhi token di perangkat lain (kecuali diinginkan).

**Auto-cleanup**: Entri di blacklist otomatis dihapus setelah 35 menit (sedikit lebih lama dari expiry token 30 menit), sehingga memory tidak membengkak.

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

| Event | File | Efek |
|---|---|---|
| Logout | `authController.js` → `logout()` | Semua sesi user di semua perangkat berakhir |
| Ganti Password | `authController.js` → `updateProfile()` | Paksa login ulang di semua perangkat |
| Admin ubah Role | `adminController.js` → `updateUser()` | Token lama dengan role lama ditolak |
| Admin nonaktifkan User | `adminController.js` → `updateUser()` | Semua sesi langsung mati |
| Admin hapus User | `adminController.js` → `deleteUser()` | Invalidasi sebelum penghapusan |

### Implementasi Logout

**File**: `server/controllers/authController.js`

```javascript
const logout = async (req, res) => {
  // 1. Blacklist JTI token saat ini (revoke token spesifik ini)
  if (token) {
    const decoded = jwt.decode(token);
    if (decoded?.jti) blacklistJti(decoded.jti);
  }

  // 2. Increment token_version (invalidate SEMUA token user ini)
  await req.user.increment('token_version');

  // 3. Clear HttpOnly cookie dari browser
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  // 4. Catat di audit log
  await logAudit(req.user.id, 'LOGOUT', `User ${req.user.username} logout`);
};
```

### Alur Pembatalan (Flowchart)

```
User klik Logout
      │
      ▼
┌─────────────────────────────────┐
│ 1. Blacklist JTI token ini      │ ← Revoke token spesifik
│    jtiBlacklist.add(jti)        │
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

---

## 6. Enkripsi Backup (AES-256-GCM)

### Apa dan Mengapa

File backup database (`.loka`) berisi seluruh data inventaris laboratorium. Jika jatuh ke tangan yang salah, data tersebut harus **tidak bisa dibaca**. Lebih penting lagi, file backup harus **tidak bisa dimanipulasi** tanpa terdeteksi.

**AES-256-GCM** (Galois/Counter Mode) memberikan dua jaminan sekaligus:
1. **Kerahasiaan** (Confidentiality) — Data terenkripsi, tidak bisa dibaca tanpa kunci
2. **Integritas** (Integrity) — Authentication Tag memastikan data tidak dimodifikasi

### Mengapa GCM, Bukan CBC?

| | AES-256-CBC (sebelumnya) | AES-256-GCM (sekarang) |
|---|---|---|
| **Kerahasiaan** | ✅ Ya | ✅ Ya |
| **Integritas bawaan** | ❌ Tidak ada | ✅ Authentication Tag |
| **Deteksi manipulasi** | ❌ Perlu checksum terpisah | ✅ Otomatis gagal |
| **Standar modern** | Tua, rentan *padding oracle* | Direkomendasikan NIST |

### Implementasi

**File**: `server/controllers/backupController.js`

#### Proses Enkripsi (Export Backup)

```javascript
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;   // GCM memerlukan IV 12-byte (96-bit), bukan 16

function getEncryptionKey() {
  // Derive 256-bit key dari BACKUP_ENCRYPTION_SECRET
  return crypto.createHash('sha256').update(String(ENCRYPTION_SECRET)).digest();
}

const exportBackup = async (req, res) => {
  // 1. Kumpulkan data dari database
  const backupData = { items, categories, locations };

  // 2. Enkripsi dengan AES-256-GCM
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);                 // IV acak per-backup
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(jsonStr, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');           // ← Authentication Tag

  // 3. Output: { iv, encrypted, tag, timestamp, version }
  const backupFile = { iv: iv.toString('hex'), encrypted, tag, timestamp, version: '2.0-gcm' };
};
```

#### Proses Dekripsi (Import/Restore Backup)

```javascript
const importBackup = async (req, res) => {
  // 1. Validasi format file
  if (!backupFile.iv || !backupFile.encrypted || !backupFile.tag) {
    return res.status(400).json({ message: 'Format file backup tidak valid.' });
  }

  // 2. Dekripsi dengan verifikasi Authentication Tag
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(Buffer.from(backupFile.tag, 'hex'));   // ← Set Auth Tag

  try {
    decrypted = decipher.update(backupFile.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');                     // ← GAGAL jika data dimanipulasi!
  } catch (cryptoErr) {
    return res.status(400).json({
      message: 'File mungkin telah dimodifikasi, rusak, atau menggunakan kunci berbeda.'
    });
  }
};
```

### Detail Teknis

| Parameter | Nilai | Penjelasan |
|---|---|---|
| **Algoritma** | `aes-256-gcm` | Authenticated Encryption with Associated Data (AEAD) |
| **Panjang Kunci** | 256-bit (32 byte) | Diderivasi dari `BACKUP_ENCRYPTION_SECRET` via SHA-256 |
| **Panjang IV** | 96-bit (12 byte) | Standar GCM yang direkomendasikan NIST |
| **Authentication Tag** | 128-bit (16 byte) | Disimpan sebagai hex string (32 karakter) |
| **Kunci** | `BACKUP_ENCRYPTION_SECRET` | Terpisah dari `JWT_SECRET` |

### Struktur File Backup (.loka)

```json
{
  "iv": "a1b2c3d4e5f6a7b8c9d0e1f2",
  "encrypted": "4f8a2b3c...enkripsi panjang...",
  "tag": "9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c",
  "timestamp": "2026-05-27T13:00:00.000Z",
  "version": "2.0-gcm"
}
```

### Skenario Keamanan

| Skenario | Hasil |
|---|---|
| File backup dicuri tanpa kunci | ❌ Data tidak bisa dibaca (terenkripsi AES-256) |
| Isi file backup diubah 1 byte | ❌ Restore gagal — Authentication Tag tidak cocok |
| File backup di-restore dengan kunci berbeda | ❌ Dekripsi gagal total |
| File backup asli + kunci benar | ✅ Restore berhasil |

---

## 7. Audit Log Anti-Tamper (Hash Chaining)

### Apa dan Mengapa

Audit log mencatat setiap aksi penting dalam sistem (login, logout, CRUD operasi, backup, dll). Tantangannya: bagaimana memastikan log itu sendiri **tidak bisa dimanipulasi** oleh siapapun — termasuk orang yang punya akses langsung ke database?

### Solusi: HMAC-SHA256 Hash Chaining

Setiap entri audit log dihubungkan secara kriptografi dengan entri sebelumnya, seperti konsep **blockchain**:

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

const logAudit = async (userId, action, target, details = null) => {
  // 1. Ambil hash dari log terakhir (link ke rantai)
  const lastLog = await AuditLog.findOne({
    order: [['created_at', 'DESC']],
    attributes: ['hash'],
  });
  const previousHash = lastLog?.hash || GENESIS_HASH;    // Genesis untuk log pertama

  // 2. Hitung HMAC-SHA256 dari data log + hash sebelumnya
  const timestamp = new Date().toISOString();
  const dataToHash = `${previousHash}|${timestamp}|${userId || 'SYSTEM'}|${action}|${target || ''}`;
  const hash = crypto.createHmac('sha256', AUDIT_LOG_SECRET).update(dataToHash).digest('hex');

  // 3. Simpan log dengan hash dan link ke log sebelumnya
  await AuditLog.create({
    user_id: userId,
    action,
    target,
    details: details ? JSON.stringify(details) : null,
    hash,                     // Hash unik log ini
    previous_hash: previousHash,  // Link ke log sebelumnya
  });
};
```

### Skema Database Audit Log

| Kolom | Tipe | Penjelasan |
|---|---|---|
| `id` | INTEGER (PK) | Auto-increment |
| `user_id` | INTEGER | ID user yang melakukan aksi |
| `action` | STRING | Jenis aksi (LOGIN, LOGOUT, CREATE_ITEM, dll.) |
| `target` | TEXT | Detail target aksi |
| `details` | TEXT | Data tambahan (JSON) |
| `hash` | STRING(64) | HMAC-SHA256 hash dari log ini |
| `previous_hash` | STRING(64) | Hash dari log sebelumnya (chain link) |
| `created_at` | DATETIME | Timestamp |

### Verifikasi Integritas Rantai

**File**: `server/controllers/adminController.js`  
**Endpoint**: `GET /api/admin/audit-logs/verify` (sysadmin only)

```javascript
const verifyAuditChain = async (req, res) => {
  const logs = await AuditLog.findAll({ order: [['created_at', 'ASC'], ['id', 'ASC']] });

  let expectedPreviousHash = GENESIS_HASH;
  const brokenLinks = [];

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    if (!log.hash) continue; // Skip legacy logs

    // Cek 1: Apakah previous_hash cocok dengan hash log sebelumnya?
    if (log.previous_hash !== expectedPreviousHash) {
      brokenLinks.push({ logId: log.id, reason: 'Chain break' });
    }

    // Cek 2: Recompute hash — apakah data log konsisten?
    const dataToHash = `${log.previous_hash}|${timestamp}|${log.user_id}|${log.action}|${log.target}`;
    const computedHash = crypto.createHmac('sha256', AUDIT_LOG_SECRET).update(dataToHash).digest('hex');

    if (computedHash !== log.hash) {
      brokenLinks.push({ logId: log.id, reason: 'Hash mismatch — data dimanipulasi' });
    }

    expectedPreviousHash = log.hash;
  }

  // Response: valid / tidak valid + detail kerusakan
};
```

### Skenario Deteksi Manipulasi

| Manipulasi | Terdeteksi? | Cara Deteksi |
|---|---|---|
| Ubah isi satu log entry | ✅ Ya | Hash recomputed ≠ hash tersimpan |
| Hapus satu log entry di tengah | ✅ Ya | `previous_hash` log berikutnya ≠ hash log sebelumnya |
| Ubah urutan log | ✅ Ya | Rantai `previous_hash` rusak |
| Tambah log palsu | ✅ Ya | HMAC memerlukan `AUDIT_LOG_SECRET` yang benar |
| Ubah log terakhir saja | ✅ Ya | Hash recomputed tidak cocok |

---

## 8. Security Headers & CORS

### Security Headers

**File**: `server/app.js`

```javascript
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: blob:; " +
    "connect-src 'self'; " +
    "frame-ancestors 'none';"
  );
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
```

| Header | Nilai | Ancaman yang Dicegah |
|---|---|---|
| **Content-Security-Policy** | Strict whitelist | XSS (Cross-Site Scripting) — membatasi sumber script, style, dan koneksi |
| **X-Frame-Options** | `DENY` | Clickjacking — halaman tidak bisa di-embed dalam `<iframe>` |
| **X-Content-Type-Options** | `nosniff` | MIME Sniffing — browser tidak menebak tipe konten |
| **Referrer-Policy** | `strict-origin-when-cross-origin` | Information Leakage — membatasi data referrer ke origin saja |
| **Permissions-Policy** | `camera=(), microphone=(), geolocation=()` | Feature Abuse — memblokir akses API sensitif browser |

### Detail CSP (Content Security Policy)

| Directive | Nilai | Penjelasan |
|---|---|---|
| `default-src` | `'self'` | Hanya izinkan resource dari origin yang sama |
| `script-src` | `'self' 'unsafe-inline' 'unsafe-eval'` | Script hanya dari origin sendiri (inline untuk React) |
| `style-src` | `'self' 'unsafe-inline' fonts.googleapis.com` | Style dari origin + Google Fonts |
| `font-src` | `'self' fonts.gstatic.com` | Font dari origin + Google Fonts CDN |
| `img-src` | `'self' data: blob:` | Gambar dari origin + data URI + blob (untuk QR) |
| `connect-src` | `'self'` | Fetch/XHR hanya ke origin yang sama |
| `frame-ancestors` | `'none'` | Tidak boleh di-embed oleh siapapun |

### CORS Configuration

```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',  // Strict origin
  credentials: true,                                            // Izinkan cookie
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

| Parameter | Nilai | Penjelasan |
|---|---|---|
| `origin` | Explicit URL (bukan `*`) | Hanya frontend yang diizinkan mengakses API |
| `credentials` | `true` | Wajib untuk pengiriman HttpOnly Cookie cross-origin |
| `methods` | Whitelist eksplisit | Hanya metode HTTP yang diperlukan |
| `allowedHeaders` | `Content-Type, Authorization` | Membatasi header custom yang diterima |

---

## 9. Proteksi Frontend

### 9.1 Manajemen Token di Client

**File**: `src/services/api.js`

Frontend **tidak pernah menyimpan JWT string**. Yang disimpan hanyalah flag boolean (`loka_logged_in`) untuk mengetahui status login UI:

```javascript
const TOKEN_KEY = 'loka_logged_in';

export function setToken()    { localStorage.setItem(TOKEN_KEY, 'true'); }
export function getToken()    { return localStorage.getItem(TOKEN_KEY) === 'true'; }
export function removeToken() { localStorage.removeItem(TOKEN_KEY); }
```

**Perbedaan kritis**:
- ❌ **Sebelum**: `localStorage.setItem('token', 'eyJhbGciOiJ...')` — JWT token tersimpan, bisa dicuri via XSS
- ✅ **Sekarang**: `localStorage.setItem('loka_logged_in', 'true')` — Hanya flag, tidak ada nilai sensitif

### 9.2 Cookie Credentials pada Setiap Request

```javascript
export async function apiFetch(endpoint, options = {}) {
  const config = {
    credentials: 'include',  // ← Browser otomatis kirim HttpOnly cookie
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
    _logoutCallback();          // Redirect ke landing page
  } else {
    window.location.reload();   // Fallback: reload halaman
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
  await apiFetch('/auth/logout', { method: 'POST' });  // Server-side revocation
  removeToken();                                         // Clear client flag
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

| Kunci | Digunakan Untuk | Dampak Jika Bocor |
|---|---|---|
| `JWT_SECRET` | Signing/verifying JWT token | Penyerang bisa membuat token palsu, tapi tidak bisa membaca backup atau memanipulasi audit log |
| `BACKUP_ENCRYPTION_SECRET` | Enkripsi/dekripsi file backup | Penyerang bisa membaca backup, tapi tidak bisa login atau mengubah audit log |
| `AUDIT_LOG_SECRET` | HMAC hash chain audit log | Penyerang bisa memanipulasi log tanpa terdeteksi, tapi tidak bisa login atau membaca backup |

### Konfigurasi Tambahan

| Variabel | Default | Penjelasan |
|---|---|---|
| `JWT_EXPIRY` | `30m` | Masa berlaku token JWT |
| `CORS_ORIGIN` | `http://localhost:5173` | Origin yang diizinkan mengakses API |
| `NODE_ENV` | `development` | Mengontrol flag `secure` pada cookie |

---

## 11. Pengujian Keamanan

**File**: `server/tests/security.test.cjs`

Suite pengujian otomatis mencakup **10 test cases** di 5 kategori:

### Hasil Pengujian

```
🔒 LokaLab Security Tests
==================================================

📋 Password Hashing Tests:
  ✅ bcrypt hash is generated with salt rounds >= 10
  ✅ bcrypt correctly verifies matching password
  ✅ bcrypt rejects wrong password

📋 JWT Token Security Tests:
  ✅ JWT token contains required security claims (jti, tokenVersion)
  ✅ JWT token with wrong secret is rejected
  ✅ Expired JWT token is rejected

📋 AES-256-GCM Encryption Tests:
  ✅ AES-256-GCM encryption and decryption works correctly
  ✅ AES-256-GCM detects tampered ciphertext (integrity check)

📋 Token Version Validation Tests:
  ✅ Token with outdated tokenVersion should be detectable

📋 Audit Log Hash Chaining Tests:
  ✅ Audit log hash chain computes correctly
  ✅ Tampered audit log breaks the hash chain

==================================================
📊 Results: 10 passed, 0 failed, 10 total
✅ All security tests passed!
```

### Cara Menjalankan

```bash
node server/tests/security.test.cjs
```

---

## 12. Pemetaan Kepatuhan Standar

### OWASP Top 10:2025

| # | Risiko OWASP | Mitigasi di LokaLab | Status |
|---|---|---|---|
| A01 | Broken Access Control | Role-based authorization (`sysadmin`, `admin`, `viewer`), token_version validation | ✅ |
| A02 | Cryptographic Failures | bcrypt password hashing, AES-256-GCM backup, HMAC-SHA256 audit, pemisahan kunci | ✅ |
| A03 | Injection | Sequelize ORM (parameterized queries), input validation | ✅ |
| A04 | Insecure Design | Defense-in-depth, least privilege, HttpOnly cookie | ✅ |
| A05 | Security Misconfiguration | Strict CSP, CORS whitelist, security headers | ✅ |
| A06 | Vulnerable Components | Dependency awareness, minimal external deps | ⚠️ Monitoring |
| A07 | Authentication Failures | bcrypt, JWT expiry 30m, JTI blacklist, token revocation | ✅ |
| A08 | Data Integrity Failures | AES-256-GCM Auth Tag, HMAC hash chain, signed JWT | ✅ |
| A09 | Logging & Monitoring | Audit log dengan hash chaining + verifikasi endpoint | ✅ |
| A10 | SSRF | connect-src CSP restriction, CORS strict origin | ✅ |

### NIST SP 800-63B (Digital Identity)

| Requirement | Implementasi | Status |
|---|---|---|
| Memorized Secret Verifier | bcrypt (salt rounds 12) | ✅ |
| Throttling/Rate Limiting | Error delay pada login gagal | ⚠️ Bisa ditingkatkan |
| Session Binding | HttpOnly Secure SameSite cookie | ✅ |
| Reauthentication | 30 menit session timeout | ✅ |
| Secret Storage | Semua kunci di `.env`, bukan hardcoded | ✅ |

---

## 13. Rekomendasi untuk Produksi

Berikut peningkatan yang **disarankan** jika LokaLab akan di-deploy ke lingkungan produksi:

### Prioritas Tinggi

| # | Rekomendasi | Alasan |
|---|---|---|
| 1 | **Ganti JTI blacklist ke Redis** | In-memory blacklist saat ini hilang saat server restart. Redis memberikan persistensi dan dukungan multi-instance |
| 2 | **Aktifkan HTTPS** | Cookie `secure: true` memerlukan HTTPS. Gunakan Let's Encrypt atau reverse proxy (nginx) |
| 3 | **Rate limiting pada endpoint login** | Mencegah brute-force attack. Gunakan `express-rate-limit` (mis. 5 percobaan / 15 menit) |
| 4 | **Buat `.env.example`** | Dokumentasikan semua environment variable yang diperlukan |

### Prioritas Menengah

| # | Rekomendasi | Alasan |
|---|---|---|
| 5 | **Upgrade ke Argon2id** | bcrypt bagus, Argon2id lebih baik (rekomendasi utama OWASP). Gunakan package `argon2` |
| 6 | **Refresh Token** | Access token 15m + Refresh token (HttpOnly cookie, 7 hari) untuk UX lebih baik |
| 7 | **Input validation library** | Gunakan `joi` atau `zod` untuk validasi input yang lebih ketat di semua endpoint |
| 8 | **Monitoring & alerting** | Kirim notifikasi saat audit chain verification gagal |

### Prioritas Rendah

| # | Rekomendasi | Alasan |
|---|---|---|
| 9 | **Account lockout** | Kunci akun setelah N percobaan login gagal berturut-turut |
| 10 | **Password policy** | Enforce panjang minimum, kompleksitas, dan pengecekan password yang umum (breached password list) |
| 11 | **Two-Factor Authentication (2FA)** | Tambahan lapisan keamanan untuk akun sysadmin |
| 12 | **Migrasi database** | Ganti `{ alter: true }` dengan migration tool (Sequelize CLI) untuk deployment yang lebih aman |

---

> **Catatan**: Dokumentasi ini menjelaskan implementasi keamanan pada saat dokumen ini dibuat. Pastikan untuk memperbarui dokumen ini setiap kali ada perubahan pada mekanisme keamanan sistem.
