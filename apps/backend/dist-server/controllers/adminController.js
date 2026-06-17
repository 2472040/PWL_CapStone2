"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAuditChain = exports.getAuditLogs = exports.deleteRoom = exports.updateRoom = exports.createRoom = exports.getRooms = exports.deleteUser = exports.updateUser = exports.createUser = exports.getUsers = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const sequelize_1 = require("sequelize");
const models_1 = require("../models");
const audit_1 = require("../middleware/audit");
const database_1 = __importDefault(require("../config/database"));
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const errors_1 = require("../utils/errors");
// =============================================
// USERS
// =============================================
exports.getUsers = (0, asyncHandler_1.default)(async (req, res) => {
    const { page, limit, search } = req.query;
    const parsedLimit = Math.min(parseInt(limit) || 200, 1000);
    const parsedPage = Math.max(parseInt(page) || 1, 1);
    const offset = (parsedPage - 1) * parsedLimit;
    const where = {};
    if (search) {
        where[sequelize_1.Op.or] = [
            { name: { [sequelize_1.Op.like]: `%${search}%` } },
            { email: { [sequelize_1.Op.like]: `%${search}%` } },
        ];
    }
    const { count, rows } = await models_1.User.findAndCountAll({
        where,
        attributes: { exclude: ['password'] },
        order: [['created_at', 'DESC']],
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
exports.createUser = (0, asyncHandler_1.default)(async (req, res) => {
    const { name, email, password, role, initials } = req.body;
    if (!name || !email || !password || !role) {
        throw new errors_1.BadRequestError('Semua field wajib diisi.');
    }
    if (password.length < 8) {
        throw new errors_1.BadRequestError('Password minimal 8 karakter.');
    }
    const existing = await models_1.User.findOne({ where: { email } });
    if (existing) {
        throw new errors_1.ConflictError('Email sudah terdaftar.');
    }
    const hashed = await bcryptjs_1.default.hash(password, 10);
    const user = await models_1.User.create({
        name,
        email,
        password: hashed,
        role,
        initials: initials ||
            name
                .split(' ')
                .map((w) => w[0])
                .join('')
                .toUpperCase()
                .slice(0, 2),
    });
    await (0, audit_1.logAudit)(req.user.id, 'user.create', `${user.name} (${user.role})`, req.ip);
    const io = req.app.get('io');
    if (io)
        io.emit('data_changed', { type: 'user' });
    const { password: _, ...userData } = user.toJSON();
    res.status(201).json({ data: userData });
});
exports.updateUser = (0, asyncHandler_1.default)(async (req, res) => {
    const user = await models_1.User.findByPk(req.params.id);
    if (!user)
        throw new errors_1.NotFoundError('Pengguna tidak ditemukan.');
    const { name, email, role, status, initials, password } = req.body;
    let credentialsChanged = false;
    const diffs = [];
    if (role && role !== user.role) {
        if (user.id === req.user.id) {
            throw new errors_1.BadRequestError('Anda tidak diperbolehkan mengubah peran (role) akun sendiri.');
        }
        diffs.push(`Role: ${user.role} ➔ ${role}`);
        credentialsChanged = true;
    }
    if (status && status !== user.status) {
        if (user.id === req.user.id && status !== 'active') {
            throw new errors_1.BadRequestError('Anda tidak diperbolehkan menonaktifkan akun sendiri.');
        }
        diffs.push(`Status: ${user.status} ➔ ${status}`);
        credentialsChanged = true;
    }
    if (password) {
        if (password.length < 8) {
            throw new errors_1.BadRequestError('Password minimal 8 karakter.');
        }
        diffs.push(`Password: [Telah diperbarui]`);
        credentialsChanged = true;
    }
    if (name && name !== user.name) {
        diffs.push(`Nama: ${user.name} ➔ ${name}`);
    }
    if (email && email !== user.email) {
        // Cek apakah email baru sudah digunakan oleh pengguna lain
        const existingEmail = await models_1.User.findOne({ where: { email } });
        if (existingEmail && existingEmail.id !== user.id) {
            throw new errors_1.ConflictError('Email sudah digunakan oleh akun lain.');
        }
        diffs.push(`Email: ${user.email} ➔ ${email}`);
    }
    if (initials && initials !== user.initials) {
        diffs.push(`Inisial: ${user.initials} ➔ ${initials}`);
    }
    if (name)
        user.name = name;
    if (email)
        user.email = email;
    if (role)
        user.role = role;
    if (status)
        user.status = status;
    if (initials)
        user.initials = initials;
    if (password)
        user.password = await bcryptjs_1.default.hash(password, 10);
    if (credentialsChanged) {
        user.token_version = (user.token_version || 0) + 1;
    }
    await user.save();
    // Log detailed audit diffs
    const details = diffs.length > 0 ? diffs.join(', ') : 'Tidak ada perubahan field';
    await (0, audit_1.logAudit)(req.user.id, 'user.update', user.name, req.ip, details);
    // Emit WebSocket update
    const io = req.app.get('io');
    if (io)
        io.emit('data_changed', { type: 'user' });
    const { password: _, ...userData } = user.toJSON();
    res.json({ data: userData });
});
exports.deleteUser = (0, asyncHandler_1.default)(async (req, res) => {
    const user = await models_1.User.findByPk(req.params.id);
    if (!user)
        throw new errors_1.NotFoundError('Pengguna tidak ditemukan.');
    if (user.id === req.user.id) {
        throw new errors_1.BadRequestError('Anda tidak diperbolehkan menghapus atau menonaktifkan akun sendiri.');
    }
    const userName = user.name;
    // Hard delete if never logged in
    if (!user.last_login) {
        await (0, audit_1.logAudit)(req.user.id, 'user.delete', userName, req.ip);
        await user.destroy();
        const io = req.app.get('io');
        if (io)
            io.emit('data_changed', { type: 'user' });
        return res.json({ message: `Pengguna "${userName}" dihapus secara permanen.` });
    }
    // Soft delete: set status to paused and invalidate tokens
    user.status = 'paused';
    user.token_version = (user.token_version || 0) + 1;
    await user.save();
    await (0, audit_1.logAudit)(req.user.id, 'user.deactivate', userName, req.ip);
    const io = req.app.get('io');
    if (io)
        io.emit('data_changed', { type: 'user' });
    res.json({ message: `Pengguna "${userName}" dinonaktifkan.` });
});
// =============================================
// ROOMS
// =============================================
exports.getRooms = (0, asyncHandler_1.default)(async (req, res) => {
    const { page, limit } = req.query;
    const parsedLimit = Math.min(parseInt(limit) || 200, 1000);
    const parsedPage = Math.max(parseInt(page) || 1, 1);
    const offset = (parsedPage - 1) * parsedLimit;
    const { count, rows } = await models_1.Room.findAndCountAll({
        include: [{ model: models_1.User, as: 'pic', attributes: ['id', 'name', 'initials'] }],
        order: [['code', 'ASC']],
        limit: parsedLimit,
        offset,
    });
    // Count assets per room using a single SQL query (eliminates N+1 problem)
    const roomIds = rows.map((r) => r.id);
    const assetCounts = roomIds.length > 0
        ? await models_1.Inventory.findAll({
            where: { room_id: roomIds },
            attributes: ['room_id', [database_1.default.fn('COUNT', database_1.default.col('id')), 'count']],
            group: ['room_id'],
            raw: true,
        })
        : [];
    const countMap = assetCounts.reduce((map, row) => {
        map[row.room_id] = parseInt(row.count, 10);
        return map;
    }, {});
    const data = rows.map((room) => ({
        ...room.toJSON(),
        assets: countMap[room.id] || 0,
    }));
    res.json({
        data,
        pagination: {
            total: count,
            page: parsedPage,
            limit: parsedLimit,
            pages: Math.ceil(count / parsedLimit),
        },
    });
});
exports.createRoom = (0, asyncHandler_1.default)(async (req, res) => {
    const { code, name, floor, capacity, pic_user_id } = req.body;
    if (!code || !name || floor === undefined) {
        throw new errors_1.BadRequestError('Code, name, dan floor wajib diisi.');
    }
    const room = await models_1.Room.create({ code, name, floor, capacity: capacity || 0, pic_user_id });
    await (0, audit_1.logAudit)(req.user.id, 'room.create', room.code, req.ip);
    const io = req.app.get('io');
    if (io)
        io.emit('data_changed', { type: 'room' });
    res.status(201).json({ data: room });
});
exports.updateRoom = (0, asyncHandler_1.default)(async (req, res) => {
    const room = await models_1.Room.findByPk(req.params.id);
    if (!room)
        throw new errors_1.NotFoundError('Ruangan tidak ditemukan.');
    const { code, name, floor, capacity, pic_user_id } = req.body;
    const diffs = [];
    if (code && code !== room.code) {
        diffs.push(`Kode: ${room.code} ➔ ${code}`);
        room.code = code;
    }
    if (name && name !== room.name) {
        diffs.push(`Nama: ${room.name} ➔ ${name}`);
        room.name = name;
    }
    if (floor !== undefined && floor !== room.floor) {
        diffs.push(`Lantai: ${room.floor} ➔ ${floor}`);
        room.floor = floor;
    }
    if (capacity !== undefined && capacity !== room.capacity) {
        diffs.push(`Kapasitas: ${room.capacity} ➔ ${capacity}`);
        room.capacity = capacity;
    }
    if (pic_user_id !== undefined && pic_user_id !== room.pic_user_id) {
        diffs.push(`PIC ID: ${room.pic_user_id} ➔ ${pic_user_id}`);
        room.pic_user_id = pic_user_id;
    }
    await room.save();
    const details = diffs.length > 0 ? diffs.join(', ') : 'Tidak ada perubahan field';
    await (0, audit_1.logAudit)(req.user.id, 'room.update', room.code, req.ip, details);
    const io = req.app.get('io');
    if (io)
        io.emit('data_changed', { type: 'room' });
    res.json({ data: room });
});
exports.deleteRoom = (0, asyncHandler_1.default)(async (req, res) => {
    const room = await models_1.Room.findByPk(req.params.id);
    if (!room)
        throw new errors_1.NotFoundError('Ruangan tidak ditemukan.');
    // Cek apakah masih ada inventaris yang terhubung ke ruangan ini
    const linkedInventoryCount = await models_1.Inventory.count({ where: { room_id: room.id } });
    if (linkedInventoryCount > 0) {
        throw new errors_1.BadRequestError(`Tidak dapat menghapus ruangan "${room.code}" karena masih terdapat ${linkedInventoryCount} item inventaris yang terhubung. Pindahkan atau hapus inventaris terlebih dahulu.`);
    }
    await (0, audit_1.logAudit)(req.user.id, 'room.delete', room.code, req.ip);
    await room.destroy();
    const io = req.app.get('io');
    if (io)
        io.emit('data_changed', { type: 'room' });
    res.json({ message: `Ruangan "${room.code}" dihapus.` });
});
// =============================================
// AUDIT LOGS
// =============================================
exports.getAuditLogs = (0, asyncHandler_1.default)(async (req, res) => {
    const { page, limit } = req.query;
    const parsedLimit = Math.min(parseInt(limit, 10) || 50, 1000);
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (parsedPage - 1) * parsedLimit;
    const { count, rows } = await models_1.AuditLog.findAndCountAll({
        include: [{ model: models_1.User, attributes: ['id', 'name', 'role'] }],
        order: [['created_at', 'DESC']],
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
exports.verifyAuditChain = (0, asyncHandler_1.default)(async (req, res) => {
    const logs = await models_1.AuditLog.findAll({
        order: [['id', 'ASC']],
    });
    const secret = process.env.AUDIT_LOG_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error('AUDIT_LOG_SECRET wajib diatur di lingkungan produksi.');
    }
    const activeSecret = secret || 'lokalab-default-audit-secret-key-2026';
    let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const issues = [];
    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        // Convert DATETIME to unix seconds string to avoid TZ / millisecond formatting issues
        const timeSecs = Math.floor(new Date(log.created_at || log.createdAt).getTime() / 1000).toString();
        // Compute expected HMAC hash including details
        const dataToHash = `${previousHash}|${timeSecs}|${log.user_id || ''}|${log.action}|${log.target || ''}|${log.ip || ''}|${log.details || ''}`;
        const computedHash = crypto_1.default.createHmac('sha256', activeSecret).update(dataToHash).digest('hex');
        // 1. Verify previous_hash link (except for genesis log if it has null previous_hash)
        if (log.previous_hash && log.previous_hash !== previousHash) {
            issues.push({
                id: log.id,
                action: log.action,
                error: `previous_hash mismatch. Expected link to "${previousHash.substring(0, 10)}...", Got link to "${log.previous_hash.substring(0, 10)}..."`,
            });
        }
        // 2. Verify current log data integrity
        if (log.hash && log.hash !== computedHash) {
            issues.push({
                id: log.id,
                action: log.action,
                error: `Tampering detected: Log data has been modified. Calculated hash: "${computedHash.substring(0, 10)}...", Stored hash: "${log.hash.substring(0, 10)}..."`,
            });
        }
        // Move chain forward using the stored hash if available, otherwise computed
        previousHash = log.hash || computedHash;
    }
    if (issues.length > 0) {
        console.error('\n⚠️🚨 [SECURITY WARNING] DETEKSI MANIPULASI AUDIT LOG! 🚨⚠️');
        console.error(`Ditemukan ${issues.length} masalah integritas data pada audit log.`);
        issues.forEach((issue) => {
            console.error(`  - Log ID ${issue.id} [${issue.action}]: ${issue.error}`);
        });
        console.error('======================================================\n');
        return res.json({
            valid: false,
            issuesCount: issues.length,
            issues,
        });
    }
    res.json({
        valid: true,
        message: 'Rantai audit log utuh dan terverifikasi secara kriptografis (tidak ada manipulasi data).',
    });
});
