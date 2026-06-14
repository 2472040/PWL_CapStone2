const fs = require('fs');
const path = require('path');
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
} = require('../models');

const ALGORITHM = 'aes-256-gcm';
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

// Replicate identical encryption key derivation logic from backupController
const getEncryptionKey = (saltHex) => {
  const secret = process.env.BACKUP_ENCRYPTION_SECRET;
  if (!secret) {
    const fallbackSecret = process.env.JWT_SECRET || 'lokalab-default-backup-secret-key-2026';
    const salt = saltHex ? Buffer.from(saltHex, 'hex') : 'loka-backup-salt-v2';
    return crypto.scryptSync(fallbackSecret, salt, 32);
  }
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : 'loka-backup-salt-v2';
  return crypto.scryptSync(secret, salt, 32);
};

// Main GCM auto backup worker
const runAutoBackup = async () => {
  try {
    console.log('⏰ [SCHEDULER] Starting automated daily AES-256-GCM database backup...');

    // Ensure backup folder exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // Gather records from all 12 tables
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
    };

    const rawJson = JSON.stringify(dbPayload);
    const checksum = crypto.createHash('sha256').update(rawJson).digest('hex');

    const iv = crypto.randomBytes(12);
    const salt = crypto.randomBytes(16).toString('hex');
    const key = getEncryptionKey(salt);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(rawJson, 'utf8', 'hex');
    encrypted += cipher.final('hex');
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

    const dateStr = new Date().toISOString().substring(0, 10);
    const filePath = path.join(BACKUP_DIR, `auto-backup-${dateStr}.loka`);

    fs.writeFileSync(filePath, JSON.stringify(backupFile, null, 2));
    console.log(`✅ [SCHEDULER] Auto backup saved successfully: ${filePath}`);

    // Log in AuditLog under system (user 1 - Anindita Hartono / Sysadmin)
    await AuditLog.create({
      user_id: 1, // Sysadmin Anindita
      action: 'backup.auto',
      target: `auto-backup-${dateStr}`,
      ip_address: '127.0.0.1',
      details: 'Automated scheduled daily backup (AES-256-GCM)',
    });

    // Prune old backups older than 7 days
    pruneOldBackups();
  } catch (err) {
    console.error('❌ [SCHEDULER] Automated database backup failed:', err);
  }
};

// Prunes automated backups older than 7 days
const pruneOldBackups = () => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return;
    const files = fs.readdirSync(BACKUP_DIR);
    const now = new Date();

    files.forEach((file) => {
      if (file.startsWith('auto-backup-') && file.endsWith('.loka')) {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        const ageDays = (now - stats.mtime) / (1000 * 60 * 60 * 24);

        if (ageDays > 7) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ [SCHEDULER] Pruned old automatic backup: ${file}`);
        }
      }
    });
  } catch (err) {
    console.error('❌ [SCHEDULER] Failed to prune old automatic backups:', err);
  }
};

// Wires up cron scheduler times
const initializeScheduler = () => {
  console.log('⏰ [SCHEDULER] Initializing LokaLab background daily cron backup task...');

  // Setup cron to run daily at 00:00 (Midnight)
  const now = new Date();
  const nextMidnight = new Date();
  nextMidnight.setHours(24, 0, 0, 0); // Next midnight
  const msToMidnight = nextMidnight - now;

  console.log(
    `⏰ [SCHEDULER] Next backup scheduled in ${Number((msToMidnight / (1000 * 60 * 60)).toFixed(2))} hours (at 00:00)`
  );

  // Timeout until midnight
  setTimeout(() => {
    runAutoBackup();
    // Daily interval
    setInterval(runAutoBackup, 24 * 60 * 60 * 1000);
  }, msToMidnight);

  // Dev backup trigger: run 10 seconds after startup for confirmation & proof of work
  setTimeout(() => {
    console.log('🧪 [SCHEDULER] Running dev-startup proof of work backup task...');
    runAutoBackup();
  }, 10000);
};

module.exports = { initializeScheduler };
