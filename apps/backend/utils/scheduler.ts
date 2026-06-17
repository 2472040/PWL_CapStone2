import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
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
} from '../models';
import { logAudit } from '../middleware/audit';
import { encryptData } from './encryption';

let _cachedSysadminId: number | null = null;
const getSysadminId = async (): Promise<number | null> => {
  if (_cachedSysadminId) return _cachedSysadminId;
  const sysadmin = await User.findOne({
    where: { role: 'sysadmin', status: 'active' },
    attributes: ['id'],
  });
  _cachedSysadminId = sysadmin ? sysadmin.id : null;
  return _cachedSysadminId;
};

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

const runAutoBackup = async (): Promise<void> => {
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
      refreshTokens: await RefreshToken.findAll(),
      revokedTokens: await RevokedToken.findAll(),
    };

    const rawJson = JSON.stringify(dbPayload);
    const encryptedResult = encryptData(rawJson);

    const backupFile = {
      ...encryptedResult,
      timestamp: new Date().toISOString(),
      version: '3.0.0',
    };

    const dateStr = new Date().toISOString().substring(0, 10);
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const filePath = path.join(BACKUP_DIR, `auto-backup-${dateStr}-${randomSuffix}.loka`);

    fs.writeFileSync(filePath, JSON.stringify(backupFile, null, 2));
    console.log(`✅ [SCHEDULER] Auto backup saved successfully: ${filePath}`);

    // Log in AuditLog under the active sysadmin (dynamically resolved)
    const sysadminId = await getSysadminId();
    if (sysadminId) {
      await logAudit(
        sysadminId,
        'backup.auto',
        `auto-backup-${dateStr}`,
        '127.0.0.1',
        'Automated scheduled daily backup (AES-256-GCM)'
      );
    } else {
      console.warn('⚠️  [SCHEDULER] No active sysadmin found — backup audit log skipped.');
    }

    // Prune old backups older than 7 days
    pruneOldBackups();
  } catch (err) {
    console.error('❌ [SCHEDULER] Automated database backup failed:', err);
  }
};

const pruneOldBackups = (): void => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return;
    const files = fs.readdirSync(BACKUP_DIR);
    const now = new Date();
    const retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);

    files.forEach((file) => {
      if (file.startsWith('auto-backup-') && file.endsWith('.loka')) {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        const ageDays = (now.getTime() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

        if (ageDays > retentionDays) {
          fs.unlinkSync(filePath);
          console.log(
            `🗑️ [SCHEDULER] Pruned old automatic backup (${Math.round(ageDays)} hari): ${file}`
          );
        }
      }
    });
  } catch (err) {
    console.error('❌ [SCHEDULER] Failed to prune old automatic backups:', err);
  }
};

export const initializeScheduler = (): void => {
  console.log('⏰ [SCHEDULER] Initializing LokaLab background daily cron backup task...');

  // Setup cron to run daily at 00:00 (Midnight)
  const now = new Date();
  const nextMidnight = new Date();
  nextMidnight.setHours(24, 0, 0, 0); // Next midnight
  const msToMidnight = nextMidnight.getTime() - now.getTime();

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
