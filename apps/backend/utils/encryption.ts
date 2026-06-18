import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

// Derives a secure 32-byte encryption key using scrypt
export const getEncryptionKey = (saltHex?: string): Buffer => {
  const secret = process.env.BACKUP_ENCRYPTION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('BACKUP_ENCRYPTION_SECRET wajib diatur di lingkungan produksi.');
    }
    // Dev fallback
    const fallbackSecret = process.env.JWT_SECRET || 'lokalab-default-backup-secret-key-2026';
    const salt = saltHex ? Buffer.from(saltHex, 'hex') : 'loka-backup-salt-v2';
    return crypto.scryptSync(fallbackSecret, salt, 32);
  }
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : 'loka-backup-salt-v2';
  return crypto.scryptSync(secret, salt, 32);
};

export interface EncryptedPayload {
  iv: string;
  salt: string;
  encrypted: string;
  tag: string;
  checksum: string;
}

/**
 * Encrypts raw text data with AES-256-GCM.
 * Returns { iv, salt, encrypted, tag, checksum }
 */
export const encryptData = (rawText: string): EncryptedPayload => {
  const checksum = crypto.createHash('sha256').update(rawText).digest('hex');
  const iv = crypto.randomBytes(12);
  const salt = crypto.randomBytes(16).toString('hex');
  const key = getEncryptionKey(salt);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

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

/**
 * Decrypts AES-256-GCM encrypted data.
 * Verifies the authentication tag and checksum.
 * Returns the decrypted raw text.
 */
export const decryptData = (backupFile: {
  iv: string;
  salt: string;
  encrypted: string;
  tag?: string;
  checksum?: string;
}): string => {
  if (!backupFile.tag) {
    throw new Error(
      'Integritas backup gagal: File tidak memiliki authentication tag (format tidak didukung).'
    );
  }

  const key = getEncryptionKey(backupFile.salt);
  const iv = Buffer.from(backupFile.iv, 'hex');
  const tag = Buffer.from(backupFile.tag, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted: string;
  try {
    decrypted = decipher.update(backupFile.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
  } catch (decryptErr) {
    throw new Error('Integritas backup gagal: File backup telah dimanipulasi atau kunci salah.', { cause: decryptErr });
  }

  if (backupFile.checksum) {
    const currentChecksum = crypto.createHash('sha256').update(decrypted).digest('hex');
    if (currentChecksum !== backupFile.checksum) {
      throw new Error('Integritas backup gagal: Checksum SHA-256 tidak cocok.');
    }
  }

  return decrypted;
};
