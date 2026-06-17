"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMaintenance = exports.getBhpPrediction = exports.createBhp = exports.updateBhp = exports.getBhp = exports.createMaintenance = exports.getMaintenanceLogs = void 0;
const models_1 = require("../models");
const audit_1 = require("../middleware/audit");
const database_1 = __importDefault(require("../config/database"));
const sequelize_1 = require("sequelize");
const maintenanceService_1 = __importDefault(require("../services/maintenanceService"));
const predictionService_1 = __importDefault(require("../services/predictionService"));
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const errors_1 = require("../utils/errors");
// =============================================
// MAINTENANCE (Staf Lab)
// =============================================
exports.getMaintenanceLogs = (0, asyncHandler_1.default)(async (req, res) => {
    const { page, limit } = req.query;
    const parsedLimit = Math.min(parseInt(limit) || 200, 1000);
    const parsedPage = Math.max(parseInt(page) || 1, 1);
    const offset = (parsedPage - 1) * parsedLimit;
    const { count, rows } = await models_1.MaintenanceLog.findAndCountAll({
        include: [
            { model: models_1.Inventory, attributes: ['id', 'code', 'name'] },
            { model: models_1.User, as: 'technician', attributes: ['id', 'name'] },
            {
                model: models_1.MaintenanceBhp,
                as: 'bhpUsed',
                include: [{ model: models_1.Bhp, attributes: ['id', 'code', 'name', 'unit'] }],
            },
        ],
        order: [['date', 'DESC']],
        limit: parsedLimit,
        offset,
    });
    res.json({
        data: rows,
        pagination: {
            total: count,
            page: parsedPage,
            limit: parsedLimit,
            pages: Math.ceil(count / parsedLimit),
        },
    });
});
exports.createMaintenance = (0, asyncHandler_1.default)(async (req, res) => {
    const { inventory_ids, action, condition_after, date, bhp_used } = req.body;
    if (!inventory_ids || !inventory_ids.length || !action || !condition_after || !date) {
        throw new errors_1.BadRequestError('Semua field wajib diisi (minimal pilih 1 aset).');
    }
    const { logsCreated, inventoryCodes } = await maintenanceService_1.default.createMaintenanceLog({
        inventory_ids,
        action,
        condition_after,
        date,
        bhp_used,
        userId: req.user.id,
    });
    await (0, audit_1.logAudit)(req.user.id, 'maintenance.create', `${inventoryCodes.join(', ')} — ${action}`, req.ip);
    const io = req.app.get('io');
    if (io) {
        io.emit('data_changed', { type: 'maintenance' });
        io.emit('data_changed', { type: 'bhp' });
        io.emit('data_changed', { type: 'inventory' });
        io.emit('notification', {
            message: `Log pemeliharaan baru dibuat untuk ${logsCreated.length} aset dengan kondisi akhir: ${condition_after}.`,
            roles: ['kalab', 'admin'],
            kind: 'info',
        });
    }
    // Return the newly created logs
    const result = await models_1.MaintenanceLog.findAll({
        where: { id: logsCreated.map((l) => l.id) },
        include: [
            { model: models_1.Inventory, attributes: ['id', 'code', 'name'] },
            { model: models_1.MaintenanceBhp, as: 'bhpUsed', include: [{ model: models_1.Bhp }] },
        ],
    });
    res.status(201).json({ data: result });
});
// =============================================
// BHP (Staf Lab)
// =============================================
exports.getBhp = (0, asyncHandler_1.default)(async (req, res) => {
    const { page, limit, search, year, month, room_id } = req.query;
    const parsedLimit = Math.min(parseInt(limit) || 200, 1000);
    const parsedPage = Math.max(parseInt(page) || 1, 1);
    const offset = (parsedPage - 1) * parsedLimit;
    const where = {};
    if (search) {
        where[sequelize_1.Op.or] = [{ name: { [sequelize_1.Op.like]: `%${search}%` } }, { code: { [sequelize_1.Op.like]: `%${search}%` } }];
    }
    if (year && year !== 'all') {
        where[sequelize_1.Op.and] = where[sequelize_1.Op.and] || [];
        where[sequelize_1.Op.and].push(database_1.default.where(database_1.default.fn('YEAR', database_1.default.col('last_in')), year));
    }
    if (month && month !== 'all') {
        where[sequelize_1.Op.and] = where[sequelize_1.Op.and] || [];
        where[sequelize_1.Op.and].push(database_1.default.where(database_1.default.fn('MONTH', database_1.default.col('last_in')), month));
    }
    if (room_id && room_id !== 'all') {
        where.room_id = room_id;
    }
    const { count, rows } = await models_1.Bhp.findAndCountAll({
        where,
        include: [{ model: models_1.Room, attributes: ['id', 'code', 'name'] }],
        order: [['code', 'ASC']],
        limit: parsedLimit,
        offset,
    });
    res.json({
        data: rows,
        pagination: {
            total: count,
            page: parsedPage,
            limit: parsedLimit,
            pages: Math.ceil(count / parsedLimit),
        },
    });
});
exports.updateBhp = (0, asyncHandler_1.default)(async (req, res) => {
    // Transaction + row lock to prevent lost-update on concurrent stock changes
    const t = await database_1.default.transaction();
    try {
        const bhp = await models_1.Bhp.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!bhp) {
            await t.rollback();
            throw new errors_1.NotFoundError('BHP tidak ditemukan.');
        }
        const { stock, min_stock, last_in, name, unit, category, reason } = req.body;
        const oldStock = parseFloat(bhp.stock) || 0;
        // Prevent setting stock to a negative value
        if (stock !== undefined && parseFloat(stock) < 0) {
            await t.rollback();
            throw new errors_1.BadRequestError('Stok tidak boleh bernilai negatif.');
        }
        if (stock !== undefined)
            bhp.stock = stock;
        if (min_stock !== undefined)
            bhp.min_stock = min_stock;
        if (last_in)
            bhp.last_in = last_in;
        if (name)
            bhp.name = name;
        if (unit)
            bhp.unit = unit;
        if (category)
            bhp.category = category;
        await bhp.save({ transaction: t });
        await t.commit();
        const diff = oldStock - bhp.stock;
        let detailStr = `Stok: ${oldStock} ➔ ${bhp.stock}`;
        if (diff > 0) {
            detailStr += ` (Pengurangan: -${diff} ${bhp.unit || 'unit'})`;
            if (reason) {
                detailStr += `, Keperluan: ${reason}`;
            }
        }
        else if (diff < 0) {
            detailStr += ` (Penambahan: +${Math.abs(diff)} ${bhp.unit || 'unit'})`;
            if (reason) {
                detailStr += `, Sumber: ${reason}`;
            }
        }
        await (0, audit_1.logAudit)(req.user.id, 'bhp.update', `${bhp.code} (${bhp.name})`, req.ip, detailStr);
        const io = req.app.get('io');
        if (io)
            io.emit('data_changed', { type: 'bhp' });
        res.json({ data: bhp });
    }
    catch (err) {
        if (t && !t.finished) {
            try {
                await t.rollback();
            }
            catch (_) {
                /* ignore */
            }
        }
        throw err;
    }
});
exports.createBhp = (0, asyncHandler_1.default)(async (req, res) => {
    const { code, name, unit, stock, min_stock, last_in, category } = req.body;
    if (!code || !name || !unit) {
        throw new errors_1.BadRequestError('Code, name, dan unit wajib diisi.');
    }
    // Prevent negative stock injection
    const parsedStock = parseFloat(stock) || 0;
    if (parsedStock < 0) {
        throw new errors_1.BadRequestError('Stok awal tidak boleh bernilai negatif.');
    }
    const bhp = await models_1.Bhp.create({
        code,
        name,
        unit,
        stock: parsedStock,
        min_stock: min_stock || 0,
        last_in: last_in || null,
        category,
    });
    await (0, audit_1.logAudit)(req.user.id, 'bhp.create', bhp.code, req.ip);
    const io = req.app.get('io');
    if (io)
        io.emit('data_changed', { type: 'bhp' });
    res.status(201).json({ data: bhp });
});
exports.getBhpPrediction = (0, asyncHandler_1.default)(async (req, res) => {
    const result = await predictionService_1.default.calculateBhpPrediction(req.params.id);
    res.json({
        status: 'success',
        data: result,
    });
});
exports.updateMaintenance = (0, asyncHandler_1.default)(async (req, res) => {
    let t;
    try {
        // Create transaction BEFORE reading to prevent stale-read race
        t = await database_1.default.transaction();
        const log = await models_1.MaintenanceLog.findByPk(req.params.id, {
            include: [{ model: models_1.Inventory, attributes: ['id', 'code', 'name'] }],
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!log) {
            await t.rollback();
            throw new errors_1.NotFoundError('Log maintenance tidak ditemukan.');
        }
        const { action, condition_after, date } = req.body;
        const diffs = [];
        if (action && action !== log.action) {
            diffs.push(`Tindakan: ${log.action} ➔ ${action}`);
            log.action = action;
        }
        if (condition_after && condition_after !== log.condition_after) {
            diffs.push(`Kondisi setelahnya: ${log.condition_after} ➔ ${condition_after}`);
            log.condition_after = condition_after;
            const inventory = await models_1.Inventory.findByPk(log.inventory_id, { transaction: t });
            if (inventory) {
                inventory.condition = condition_after;
                inventory.last_checked = new Date();
                await inventory.save({ transaction: t });
            }
        }
        if (date && date !== log.date) {
            diffs.push(`Tanggal: ${log.date} ➔ ${date}`);
            log.date = date;
        }
        await log.save({ transaction: t });
        await t.commit();
        const details = diffs.length > 0 ? diffs.join(', ') : 'Tidak ada perubahan field';
        const logIdentifier = log.code || `log#${log.id}`;
        await (0, audit_1.logAudit)(req.user.id, 'maintenance.update', logIdentifier, req.ip, details);
        const io = req.app.get('io');
        if (io) {
            io.emit('data_changed', { type: 'maintenance' });
            io.emit('data_changed', { type: 'inventory' });
            io.emit('notification', {
                message: `Log pemeliharaan ${logIdentifier} untuk aset ${log.Inventory?.name || 'Aset'} telah diperbarui oleh Staf Lab.`,
                roles: ['kalab', 'admin'],
                kind: 'info',
            });
        }
        const result = await models_1.MaintenanceLog.findByPk(log.id, {
            include: [
                { model: models_1.Inventory, attributes: ['id', 'code', 'name'] },
                { model: models_1.MaintenanceBhp, as: 'bhpUsed', include: [{ model: models_1.Bhp }] },
            ],
        });
        res.json({ data: result });
    }
    catch (err) {
        if (t && !t.finished) {
            try {
                await t.rollback();
            }
            catch (rollbackErr) {
                // Ignored
            }
        }
        throw err;
    }
});
