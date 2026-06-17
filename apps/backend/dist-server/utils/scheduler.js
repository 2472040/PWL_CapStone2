"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeScheduler = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const models_1 = require("../models");
const audit_1 = require("../middleware/audit");
const encryption_1 = require("./encryption");
let _cachedSysadminId = null;
const getSysadminId = async () => {
    if (_cachedSysadminId)
        return _cachedSysadminId;
    const sysadmin = await models_1.User.findOne({
        where: { role: 'sysadmin', status: 'active' },
        attributes: ['id'],
    });
    _cachedSysadminId = sysadmin ? sysadmin.id : null;
    return _cachedSysadminId;
};
const BACKUP_DIR = path_1.default.join(__dirname, '..', 'backups');
const runAutoBackup = async () => {
    try {
        console.log('⏰ [SCHEDULER] Starting automated daily AES-256-GCM database backup...');
        // Ensure backup folder exists
        if (!fs_1.default.existsSync(BACKUP_DIR)) {
            fs_1.default.mkdirSync(BACKUP_DIR, { recursive: true });
        }
        // Gather records from all 12 tables
        const dbPayload = {
            users: await models_1.User.findAll(),
            rooms: await models_1.Room.findAll(),
            inventory: await models_1.Inventory.findAll(),
            bhp: await models_1.Bhp.findAll(),
            drafts: await models_1.Draft.findAll(),
            draftItems: await models_1.DraftItem.findAll(),
            draftApprovals: await models_1.DraftApproval.findAll(),
            maintenanceLogs: await models_1.MaintenanceLog.findAll(),
            maintenanceBhp: await models_1.MaintenanceBhp.findAll(),
            receivings: await models_1.Receiving.findAll(),
            labels: await models_1.Label.findAll(),
            auditLogs: await models_1.AuditLog.findAll(),
            refreshTokens: await models_1.RefreshToken.findAll(),
            revokedTokens: await models_1.RevokedToken.findAll(),
        };
        const rawJson = JSON.stringify(dbPayload);
        const encryptedResult = (0, encryption_1.encryptData)(rawJson);
        const backupFile = {
            ...encryptedResult,
            timestamp: new Date().toISOString(),
            version: '3.0.0',
        };
        const dateStr = new Date().toISOString().substring(0, 10);
        const randomSuffix = crypto_1.default.randomBytes(4).toString('hex');
        const filePath = path_1.default.join(BACKUP_DIR, `auto-backup-${dateStr}-${randomSuffix}.loka`);
        fs_1.default.writeFileSync(filePath, JSON.stringify(backupFile, null, 2));
        console.log(`✅ [SCHEDULER] Auto backup saved successfully: ${filePath}`);
        // Log in AuditLog under the active sysadmin (dynamically resolved)
        const sysadminId = await getSysadminId();
        if (sysadminId) {
            await (0, audit_1.logAudit)(sysadminId, 'backup.auto', `auto-backup-${dateStr}`, '127.0.0.1', 'Automated scheduled daily backup (AES-256-GCM)');
        }
        else {
            console.warn('⚠️  [SCHEDULER] No active sysadmin found — backup audit log skipped.');
        }
        // Prune old backups older than 7 days
        pruneOldBackups();
    }
    catch (err) {
        console.error('❌ [SCHEDULER] Automated database backup failed:', err);
    }
};
const pruneOldBackups = () => {
    try {
        if (!fs_1.default.existsSync(BACKUP_DIR))
            return;
        const files = fs_1.default.readdirSync(BACKUP_DIR);
        const now = new Date();
        const retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
        files.forEach((file) => {
            if (file.startsWith('auto-backup-') && file.endsWith('.loka')) {
                const filePath = path_1.default.join(BACKUP_DIR, file);
                const stats = fs_1.default.statSync(filePath);
                const ageDays = (now.getTime() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
                if (ageDays > retentionDays) {
                    fs_1.default.unlinkSync(filePath);
                    console.log(`🗑️ [SCHEDULER] Pruned old automatic backup (${Math.round(ageDays)} hari): ${file}`);
                }
            }
        });
    }
    catch (err) {
        console.error('❌ [SCHEDULER] Failed to prune old automatic backups:', err);
    }
};
const initializeScheduler = () => {
    console.log('⏰ [SCHEDULER] Initializing LokaLab background daily cron backup task...');
    // Setup cron to run daily at 00:00 (Midnight)
    const now = new Date();
    const nextMidnight = new Date();
    nextMidnight.setHours(24, 0, 0, 0); // Next midnight
    const msToMidnight = nextMidnight.getTime() - now.getTime();
    console.log(`⏰ [SCHEDULER] Next backup scheduled in ${Number((msToMidnight / (1000 * 60 * 60)).toFixed(2))} hours (at 00:00)`);
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
exports.initializeScheduler = initializeScheduler;
