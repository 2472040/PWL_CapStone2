"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptData = exports.encryptData = exports.getEncryptionKey = void 0;
const crypto_1 = __importDefault(require("crypto"));
const ALGORITHM = 'aes-256-gcm';
// Derives a secure 32-byte encryption key using scrypt
const getEncryptionKey = (saltHex) => {
    const secret = process.env.BACKUP_ENCRYPTION_SECRET;
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('BACKUP_ENCRYPTION_SECRET wajib diatur di lingkungan produksi.');
        }
        // Dev fallback
        const fallbackSecret = process.env.JWT_SECRET || 'lokalab-default-backup-secret-key-2026';
        const salt = saltHex ? Buffer.from(saltHex, 'hex') : 'loka-backup-salt-v2';
        return crypto_1.default.scryptSync(fallbackSecret, salt, 32);
    }
    const salt = saltHex ? Buffer.from(saltHex, 'hex') : 'loka-backup-salt-v2';
    return crypto_1.default.scryptSync(secret, salt, 32);
};
exports.getEncryptionKey = getEncryptionKey;
/**
 * Encrypts raw text data with AES-256-GCM.
 * Returns { iv, salt, encrypted, tag, checksum }
 */
const encryptData = (rawText) => {
    const checksum = crypto_1.default.createHash('sha256').update(rawText).digest('hex');
    const iv = crypto_1.default.randomBytes(12);
    const salt = crypto_1.default.randomBytes(16).toString('hex');
    const key = (0, exports.getEncryptionKey)(salt);
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(rawText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return {
        iv: iv.toString('hex'),
        salt,
        encrypted,
        tag,
        checksum,
    };
};
exports.encryptData = encryptData;
/**
 * Decrypts AES-256-GCM encrypted data.
 * Verifies the authentication tag and checksum.
 * Returns the decrypted raw text.
 */
const decryptData = (backupFile) => {
    if (!backupFile.tag) {
        throw new Error('Integritas backup gagal: File tidak memiliki authentication tag (format tidak didukung).');
    }
    const key = (0, exports.getEncryptionKey)(backupFile.salt);
    const iv = Buffer.from(backupFile.iv, 'hex');
    const tag = Buffer.from(backupFile.tag, 'hex');
    const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let decrypted;
    try {
        decrypted = decipher.update(backupFile.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
    }
    catch (decryptErr) {
        throw new Error('Integritas backup gagal: File backup telah dimanipulasi atau kunci salah.', {
            cause: decryptErr,
        });
    }
    if (backupFile.checksum) {
        const currentChecksum = crypto_1.default.createHash('sha256').update(decrypted).digest('hex');
        if (currentChecksum !== backupFile.checksum) {
            throw new Error('Integritas backup gagal: Checksum SHA-256 tidak cocok.');
        }
    }
    return decrypted;
};
exports.decryptData = decryptData;
