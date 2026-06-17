"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.restoreBackup = exports.exportBackup = void 0;
const models_1 = require("../models");
const audit_1 = require("../middleware/audit");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const errors_1 = require("../utils/errors");
const encryption_1 = require("../utils/encryption");
/**
 * GET /api/backup/export
 * Generates an AES-256-GCM encrypted JSON database backup file
 * containing records from all 12 key database tables.
 * Authorized for: sysadmin only
 */
exports.exportBackup = (0, asyncHandler_1.default)(async (req, res) => {
    // Gather records from all tables
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
    await (0, audit_1.logAudit)(req.user.id, 'backup.export', 'database_backup', req.ip);
    res.setHeader('Content-Disposition', `attachment; filename=lokalab_backup_${Date.now()}.loka`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(backupFile, null, 2));
});
/**
 * POST /api/backup/restore
 * Decrypts, validates integrity via GCM tag & checksum, and restores database state
 * Authorized for: sysadmin only
 */
exports.restoreBackup = (0, asyncHandler_1.default)(async (req, res) => {
    const { backupFile } = req.body;
    if (!backupFile || !backupFile.iv || !backupFile.encrypted) {
        throw new errors_1.BadRequestError('Payload file backup tidak valid.');
    }
    let decrypted;
    try {
        decrypted = (0, encryption_1.decryptData)(backupFile);
    }
    catch (decryptErr) {
        throw new errors_1.BadRequestError(decryptErr.message);
    }
    const payload = JSON.parse(decrypted);
    // Start transaction only after validation succeeds
    const transaction = await models_1.sequelize.transaction();
    try {
        // Disable foreign keys temporarily for bulk truncate & restore
        await models_1.sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });
        // Truncate tables
        const modelsList = [
            models_1.User,
            models_1.Room,
            models_1.Inventory,
            models_1.Bhp,
            models_1.Draft,
            models_1.DraftItem,
            models_1.DraftApproval,
            models_1.MaintenanceLog,
            models_1.MaintenanceBhp,
            models_1.Receiving,
            models_1.Label,
            models_1.AuditLog,
            models_1.RefreshToken,
            models_1.RevokedToken,
        ];
        for (const model of modelsList) {
            await model.destroy({ truncate: true, force: true, transaction });
        }
        // Restore tables in safe order
        if (payload.users && payload.users.length)
            await models_1.User.bulkCreate(payload.users, { transaction });
        if (payload.rooms && payload.rooms.length)
            await models_1.Room.bulkCreate(payload.rooms, { transaction });
        if (payload.inventory && payload.inventory.length)
            await models_1.Inventory.bulkCreate(payload.inventory, { transaction });
        if (payload.bhp && payload.bhp.length)
            await models_1.Bhp.bulkCreate(payload.bhp, { transaction });
        if (payload.drafts && payload.drafts.length)
            await models_1.Draft.bulkCreate(payload.drafts, { transaction });
        if (payload.draftItems && payload.draftItems.length)
            await models_1.DraftItem.bulkCreate(payload.draftItems, { transaction });
        if (payload.draftApprovals && payload.draftApprovals.length)
            await models_1.DraftApproval.bulkCreate(payload.draftApprovals, { transaction });
        if (payload.maintenanceLogs && payload.maintenanceLogs.length)
            await models_1.MaintenanceLog.bulkCreate(payload.maintenanceLogs, { transaction });
        if (payload.maintenanceBhp && payload.maintenanceBhp.length)
            await models_1.MaintenanceBhp.bulkCreate(payload.maintenanceBhp, { transaction });
        if (payload.receivings && payload.receivings.length)
            await models_1.Receiving.bulkCreate(payload.receivings, { transaction });
        if (payload.labels && payload.labels.length)
            await models_1.Label.bulkCreate(payload.labels, { transaction });
        if (payload.auditLogs && payload.auditLogs.length)
            await models_1.AuditLog.bulkCreate(payload.auditLogs, { transaction });
        if (payload.refreshTokens && payload.refreshTokens.length)
            await models_1.RefreshToken.bulkCreate(payload.refreshTokens, { transaction });
        if (payload.revokedTokens && payload.revokedTokens.length)
            await models_1.RevokedToken.bulkCreate(payload.revokedTokens, { transaction });
        // Enable foreign keys back
        await models_1.sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
        await transaction.commit();
        // Reset the in-memory audit hash cache so the next logAudit() chains
        // from the correct (restored) last hash instead of the stale pre-restore value
        (0, audit_1.resetAuditCache)();
        await (0, audit_1.logAudit)(req.user.id, 'backup.restore', 'database_restore', req.ip);
        res.json({ message: 'Database berhasil direstore secara penuh dengan verifikasi checksum!' });
    }
    catch (err) {
        if (transaction && !transaction.finished) {
            try {
                await models_1.sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
            }
            catch (_) {
                /* ignore error resetting foreign keys if connection is dead */
            }
            try {
                await transaction.rollback();
            }
            catch (_) {
                /* ignore */
            }
        }
        throw err;
    }
});
