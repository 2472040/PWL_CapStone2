"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDraftItem = exports.deleteDraftItem = exports.addDraftItem = exports.submitDraft = exports.updateDraft = exports.createDraft = exports.getDrafts = void 0;
const models_1 = require("../../models");
const audit_1 = require("../../middleware/audit");
const procurementService_1 = __importDefault(require("../../services/procurementService"));
const asyncHandler_1 = __importDefault(require("../../utils/asyncHandler"));
const errors_1 = require("../../utils/errors");
const database_1 = __importDefault(require("../../config/database"));
exports.getDrafts = (0, asyncHandler_1.default)(async (req, res) => {
    const where = {};
    if (req.user.role === 'kalab' || req.user.role === 'staflab')
        where.created_by = req.user.id;
    if (req.query.status)
        where.status = req.query.status;
    const { page, limit } = req.query;
    const parsedLimit = Math.min(parseInt(limit) || 200, 1000);
    const parsedPage = Math.max(parseInt(page) || 1, 1);
    const offset = (parsedPage - 1) * parsedLimit;
    const { count, rows } = await models_1.Draft.findAndCountAll({
        where,
        include: [
            { model: models_1.User, as: 'creator', attributes: ['id', 'name', 'initials', 'role'] },
            { model: models_1.DraftItem, as: 'items', include: [{ model: models_1.DraftApproval, as: 'approval' }] },
        ],
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
exports.createDraft = (0, asyncHandler_1.default)(async (req, res) => {
    const { title, items } = req.body;
    const { draft, code } = await procurementService_1.default.createDraftService({
        title,
        items,
        userId: req.user.id,
    });
    await (0, audit_1.logAudit)(req.user.id, 'draft.create', code, req.ip);
    const io = req.app.get('io');
    if (io)
        io.emit('data_changed', { type: 'draft' });
    const result = await models_1.Draft.findByPk(draft.id, { include: [{ model: models_1.DraftItem, as: 'items' }] });
    res.status(201).json({ data: result });
});
exports.updateDraft = (0, asyncHandler_1.default)(async (req, res) => {
    const draft = await models_1.Draft.findByPk(req.params.id);
    if (!draft)
        throw new errors_1.NotFoundError('Draf tidak ditemukan.');
    if (draft.status !== 'draft' && draft.status !== 'revision')
        throw new errors_1.BadRequestError('Draf sudah tidak dapat diubah.');
    if (draft.created_by !== req.user.id && req.user.role !== 'kalab')
        throw new errors_1.ForbiddenError('Anda tidak berhak mengubah draf ini.');
    if (req.body.title)
        draft.title = req.body.title;
    await draft.save();
    await (0, audit_1.logAudit)(req.user.id, 'draft.update', draft.code, req.ip);
    const io = req.app.get('io');
    if (io)
        io.emit('data_changed', { type: 'draft' });
    res.json({ data: draft });
});
exports.submitDraft = (0, asyncHandler_1.default)(async (req, res) => {
    const t = await database_1.default.transaction();
    try {
        const draft = await models_1.Draft.findByPk(req.params.id, {
            include: [{ model: models_1.DraftItem, as: 'items' }],
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!draft) {
            await t.rollback();
            throw new errors_1.NotFoundError('Draf tidak ditemukan.');
        }
        if (draft.status !== 'draft' && draft.status !== 'revision') {
            await t.rollback();
            throw new errors_1.BadRequestError('Draf sudah disubmit.');
        }
        if (draft.created_by !== req.user.id && req.user.role !== 'kalab') {
            await t.rollback();
            throw new errors_1.ForbiddenError('Anda tidak berhak mengirim draf ini.');
        }
        if (draft.items.length === 0) {
            await t.rollback();
            throw new errors_1.BadRequestError('Draf harus memiliki minimal 1 item.');
        }
        draft.status = 'submitted';
        draft.submitted_at = new Date();
        draft.revision_notes = null;
        await draft.save({ transaction: t });
        await t.commit();
        await (0, audit_1.logAudit)(req.user.id, 'draft.submit', draft.code, req.ip);
        const io = req.app.get('io');
        if (io) {
            io.emit('data_changed', { type: 'draft' });
            io.emit('notification', {
                message: `Draf pengadaan baru ${draft.code} - "${draft.title}" telah diajukan oleh Kepala Lab.`,
                roles: ['kaprodi'],
                kind: 'info',
            });
        }
        res.json({ data: draft });
    }
    catch (err) {
        if (t && !t.finished) {
            try {
                await t.rollback();
            }
            catch (_) { }
        }
        throw err;
    }
});
exports.addDraftItem = (0, asyncHandler_1.default)(async (req, res) => {
    const draft = await models_1.Draft.findByPk(req.params.id);
    if (!draft)
        throw new errors_1.NotFoundError('Draf tidak ditemukan.');
    if (draft.status !== 'draft' && draft.status !== 'revision')
        throw new errors_1.BadRequestError('Draf sudah tidak dapat diubah.');
    if (draft.created_by !== req.user.id && req.user.role !== 'kalab')
        throw new errors_1.ForbiddenError('Anda tidak berhak mengubah item pada draf orang lain.');
    const { kind, name, qty, unit, price, link, replaces } = req.body;
    if (!kind || !name || !qty || !unit || !price) {
        throw new errors_1.BadRequestError('Semua field item wajib diisi.');
    }
    const item = await models_1.DraftItem.create({
        draft_id: draft.id,
        kind,
        name,
        qty,
        unit,
        price,
        link,
        replaces,
    });
    await (0, audit_1.logAudit)(req.user.id, 'draft.addItem', `${draft.code} · ${name}`, req.ip);
    const io = req.app.get('io');
    if (io)
        io.emit('data_changed', { type: 'draft' });
    res.status(201).json({ data: item });
});
exports.deleteDraftItem = (0, asyncHandler_1.default)(async (req, res) => {
    const { itemId } = req.params;
    const item = await models_1.DraftItem.findByPk(itemId, {
        include: [{ model: models_1.Draft, as: 'draft' }],
    });
    if (!item)
        throw new errors_1.NotFoundError('Item draf tidak ditemukan.');
    if (item.draft.created_by !== req.user.id && req.user.role !== 'kalab')
        throw new errors_1.ForbiddenError('Anda tidak berhak menghapus item dari draf orang lain.');
    if (item.draft.status !== 'draft' && item.draft.status !== 'revision') {
        throw new errors_1.BadRequestError('Tidak bisa menghapus item dari draf yang sudah dikunci.');
    }
    const draftCode = item.draft.code;
    const itemName = item.name;
    await item.destroy();
    await (0, audit_1.logAudit)(req.user.id, 'procurement.remove_item', `${itemName} dari ${draftCode}`, req.ip);
    const io = req.app.get('io');
    if (io)
        io.emit('data_changed', { type: 'draft' });
    res.json({ message: 'Item draf berhasil dihapus.' });
});
exports.updateDraftItem = (0, asyncHandler_1.default)(async (req, res) => {
    const { itemId } = req.params;
    const item = await models_1.DraftItem.findByPk(itemId, {
        include: [{ model: models_1.Draft, as: 'draft' }],
    });
    if (!item)
        throw new errors_1.NotFoundError('Item draf tidak ditemukan.');
    if (item.draft.created_by !== req.user.id && req.user.role !== 'kalab')
        throw new errors_1.ForbiddenError('Anda tidak berhak mengubah item pada draf orang lain.');
    if (item.draft.status !== 'draft' && item.draft.status !== 'revision') {
        throw new errors_1.BadRequestError('Tidak bisa mengubah item pada draf yang sudah dikunci.');
    }
    const { kind, name, qty, unit, price, link, replaces } = req.body;
    if (!kind || !name || !qty || !unit || !price) {
        throw new errors_1.BadRequestError('Semua field wajib diisi.');
    }
    item.kind = kind;
    item.name = name;
    item.qty = qty;
    item.unit = unit;
    item.price = price;
    item.link = link || null;
    item.replaces = kind === 'Inventaris' ? replaces || null : null;
    await item.save();
    await (0, audit_1.logAudit)(req.user.id, 'draft.updateItem', `${item.draft.code} · ${name}`, req.ip);
    const io = req.app.get('io');
    if (io)
        io.emit('data_changed', { type: 'draft' });
    res.json({ data: item });
});
