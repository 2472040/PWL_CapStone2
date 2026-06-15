const crypto = require('crypto');
const {
  User,
  Room,
  Inventory,
  Bhp,
  Draft,
  DraftItem,
  DraftApproval,
  MaintenanceLog,
  MaintenanceBhp,
  Receiving,
  Label,
  AuditLog,
  RefreshToken,
  RevokedToken,
  sequelize,
} = require('../models');
const { logAudit, resetAuditCache } = require('../middleware/audit');

const ALGORITHM = 'aes-256-gcm';

// Derives a secure 32-byte encryption key using scrypt and a dynamic or fallback salt
const getEncryptionKey = (saltHex) => {
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

/**
 * GET /api/backup/export
 * Generates an AES-256-GCM encrypted JSON database backup file
 * containing records from all 12 key database tables.
 * Authorized for: sysadmin only
 */
const exportBackup = async (req, res) => {
  try {
    // Gather records from all tables
    const dbPayload = {
      users: await User.findAll(),
      rooms: await Room.findAll(),
      inventory: await Inventory.findAll(),
      bhp: await Bhp.findAll(),
      drafts: await Draft.findAll(),
      draftItems: await DraftItem.findAll(),
      draftApprovals: await DraftApproval.findAll(),
      maintenanceLogs: await MaintenanceLog.findAll(),
      maintenanceBhp: await MaintenanceBhp.findAll(),
      receivings: await Receiving.findAll(),
      labels: await Label.findAll(),
      auditLogs: await AuditLog.findAll(),
      refreshTokens: await RefreshToken.findAll(),
      revokedTokens: await RevokedToken.findAll(),
    };

    const rawJson = JSON.stringify(dbPayload);

    // Generate SHA-256 integrity checksum of raw JSON (secondary validation)
    const checksum = crypto.createHash('sha256').update(rawJson).digest('hex');

    // Setup AES-256-GCM cipher (12-byte IV standard for GCM)
    const iv = crypto.randomBytes(12);
    const salt = crypto.randomBytes(16).toString('hex'); // 16-byte dynamic salt
    const key = getEncryptionKey(salt);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(rawJson, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get 16-byte authentication tag
    const tag = cipher.getAuthTag().toString('hex');

    const backupFile = {
      iv: iv.toString('hex'),
      salt,
      encrypted,
      tag,
      checksum,
      timestamp: new Date().toISOString(),
      version: '3.0.0',
    };

    await logAudit(req.user.id, 'backup.export', 'database_backup', req.ip);

    res.setHeader('Content-Disposition', `attachment; filename=lokalab_backup_${Date.now()}.loka`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(backupFile, null, 2));
  } catch (err) {
    console.error('[Backup Export Error]', err);
    res.status(500).json({ error: 'Gagal membuat backup terenkripsi.' });
  }
};

/**
 * POST /api/backup/restore
 * Decrypts, validates integrity via GCM tag & checksum, and restores database state
 * Authorized for: sysadmin only
 */
const restoreBackup = async (req, res) => {
  try {
    const { backupFile } = req.body;
    if (!backupFile || !backupFile.iv || !backupFile.encrypted) {
      return res.status(400).json({ error: 'Payload file backup tidak valid.' });
    }

    if (!backupFile.tag) {
      return res.status(400).json({
        error:
          'Integritas backup gagal: File tidak memiliki authentication tag (format tidak didukung).',
      });
    }

    // Decrypt data using the stored salt (falls back to legacy static salt if undefined)
    const key = getEncryptionKey(backupFile.salt);
    const iv = Buffer.from(backupFile.iv, 'hex');
    const tag = Buffer.from(backupFile.tag, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted;
    try {
      decrypted = decipher.update(backupFile.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
    } catch (decryptErr) {
      return res.status(400).json({
        error: 'Integritas backup gagal: File backup telah dimanipulasi atau kunci salah.',
      });
    }

    // Verify SHA-256 Checksum Integrity if present
    if (backupFile.checksum) {
      const currentChecksum = crypto.createHash('sha256').update(decrypted).digest('hex');
      if (currentChecksum !== backupFile.checksum) {
        return res
          .status(400)
          .json({ error: 'Integritas backup gagal: Checksum SHA-256 tidak cocok.' });
      }
    }

    const payload = JSON.parse(decrypted);

    // Start transaction only after validation succeeds
    const transaction = await sequelize.transaction();
    try {
      // Disable foreign keys temporarily for bulk truncate & restore
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });

      // Truncate tables
      const modelsList = [
        User,
        Room,
        Inventory,
        Bhp,
        Draft,
        DraftItem,
        DraftApproval,
        MaintenanceLog,
        MaintenanceBhp,
        Receiving,
        Label,
        AuditLog,
        RefreshToken,
        RevokedToken,
      ];
      for (const model of modelsList) {
        await model.destroy({ truncate: true, force: true, transaction });
      }

      // Restore tables in safe order
      if (payload.users && payload.users.length)
        await User.bulkCreate(payload.users, { transaction });
      if (payload.rooms && payload.rooms.length)
        await Room.bulkCreate(payload.rooms, { transaction });
      if (payload.inventory && payload.inventory.length)
        await Inventory.bulkCreate(payload.inventory, { transaction });
      if (payload.bhp && payload.bhp.length) await Bhp.bulkCreate(payload.bhp, { transaction });
      if (payload.drafts && payload.drafts.length)
        await Draft.bulkCreate(payload.drafts, { transaction });
      if (payload.draftItems && payload.draftItems.length)
        await DraftItem.bulkCreate(payload.draftItems, { transaction });
      if (payload.draftApprovals && payload.draftApprovals.length)
        await DraftApproval.bulkCreate(payload.draftApprovals, { transaction });
      if (payload.maintenanceLogs && payload.maintenanceLogs.length)
        await MaintenanceLog.bulkCreate(payload.maintenanceLogs, { transaction });
      if (payload.maintenanceBhp && payload.maintenanceBhp.length)
        await MaintenanceBhp.bulkCreate(payload.maintenanceBhp, { transaction });
      if (payload.receivings && payload.receivings.length)
        await Receiving.bulkCreate(payload.receivings, { transaction });
      if (payload.labels && payload.labels.length)
        await Label.bulkCreate(payload.labels, { transaction });
      if (payload.auditLogs && payload.auditLogs.length)
        await AuditLog.bulkCreate(payload.auditLogs, { transaction });
      if (payload.refreshTokens && payload.refreshTokens.length)
        await RefreshToken.bulkCreate(payload.refreshTokens, { transaction });
      if (payload.revokedTokens && payload.revokedTokens.length)
        await RevokedToken.bulkCreate(payload.revokedTokens, { transaction });

      // Enable foreign keys back
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });

      await transaction.commit();

      // Reset the in-memory audit hash cache so the next logAudit() chains
      // from the correct (restored) last hash instead of the stale pre-restore value
      resetAuditCache();

      await logAudit(req.user.id, 'backup.restore', 'database_restore', req.ip);

      res.json({ message: 'Database berhasil direstore secara penuh dengan verifikasi checksum!' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('[Backup Restore Error]', err);
    res
      .status(500)
      .json({ error: 'Gagal merestore backup. File mungkin tidak kompatibel atau rusak.' });
  }
};

module.exports = { exportBackup, restoreBackup };
