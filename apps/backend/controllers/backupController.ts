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
  sequelize,
} from '../models';
import { logAudit, resetAuditCache } from '../middleware/audit';
import asyncHandler from '../utils/asyncHandler';
import { BadRequestError } from '../utils/errors';
import { encryptData, decryptData } from '../utils/encryption';

/**
 * GET /api/backup/export
 * Generates an AES-256-GCM encrypted JSON database backup file
 * containing records from all 12 key database tables.
 * Authorized for: sysadmin only
 */
export const exportBackup = asyncHandler(async (req: any, res: any) => {
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
  const encryptedResult = encryptData(rawJson);

  const backupFile = {
    ...encryptedResult,
    timestamp: new Date().toISOString(),
    version: '3.0.0',
  };

  await logAudit(req.user.id, 'backup.export', 'database_backup', req.ip);

  res.setHeader('Content-Disposition', `attachment; filename=lokalab_backup_${Date.now()}.loka`);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(backupFile, null, 2));
});

/**
 * POST /api/backup/restore
 * Decrypts, validates integrity via GCM tag & checksum, and restores database state
 * Authorized for: sysadmin only
 */
export const restoreBackup = asyncHandler(async (req: any, res: any) => {
  const { backupFile } = req.body;
  if (!backupFile || !backupFile.iv || !backupFile.encrypted) {
    throw new BadRequestError('Payload file backup tidak valid.');
  }

  let decrypted: string;
  try {
    decrypted = decryptData(backupFile);
  } catch (decryptErr: any) {
    throw new BadRequestError(decryptErr.message);
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
    if (transaction && !(transaction as any).finished) {
      try {
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
      } catch (_) {
        /* ignore error resetting foreign keys if connection is dead */
      }
      try {
        await transaction.rollback();
      } catch (_) {
        /* ignore */
      }
    }
    throw err;
  }
});
