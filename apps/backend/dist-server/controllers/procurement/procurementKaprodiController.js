"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestRevision = exports.getDraftHistory = exports.finalizeDraft = exports.approveDraftItems = exports.getDraftsForReview = void 0;
const models_1 = require("../../models");
const audit_1 = require("../../middleware/audit");
const asyncHandler_1 = __importDefault(require("../../utils/asyncHandler"));
const errors_1 = require("../../utils/errors");
const database_1 = __importDefault(require("../../config/database"));
const sequelize_1 = require("sequelize");
exports.getDraftsForReview = (0, asyncHandler_1.default)(async (req, res) => {
    const { page, limit } = req.query;
    const parsedLimit = Math.min(parseInt(limit) || 200, 1000);
    const parsedPage = Math.max(parseInt(page) || 1, 1);
    const offset = (parsedPage - 1) * parsedLimit;
    const { count, rows } = await models_1.Draft.findAndCountAll({
        where: { status: 'submitted' },
        include: [
            { model: models_1.User, as: 'creator', attributes: ['id', 'name', 'initials', 'role'] },
            { model: models_1.DraftItem, as: 'items', include: [{ model: models_1.DraftApproval, as: 'approval' }] },
        ],
        order: [['submitted_at', 'DESC']],
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
exports.approveDraftItems = (0, asyncHandler_1.default)(async (req, res) => {
    const t = await database_1.default.transaction();
    try {
        const draft = await models_1.Draft.findByPk(req.params.id, {
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!draft) {
            await t.rollback();
            throw new errors_1.NotFoundError('Draf tidak ditemukan.');
        }
        if (draft.status !== 'submitted') {
            await t.rollback();
            throw new errors_1.BadRequestError('Draf belum disubmit atau sudah difinalisasi.');
        }
        const { decisions } = req.body;
        if (!decisions || !Array.isArray(decisions)) {
            await t.rollback();
            throw new errors_1.BadRequestError('Data decisions wajib diisi.');
        }
        for (const d of decisions) {
            if (d.status === 'delete' || d.status === null) {
                await models_1.DraftApproval.destroy({
                    where: { draft_item_id: d.item_id },
                    transaction: t,
                });
                continue;
            }
            const existing = await models_1.DraftApproval.findOne({
                where: { draft_item_id: d.item_id },
                transaction: t,
            });
            if (existing) {
                existing.status = d.status;
                existing.approved_by = req.user.id;
                existing.notes = d.notes || null;
                await existing.save({ transaction: t });
            }
            else {
                await models_1.DraftApproval.create({
                    draft_item_id: d.item_id,
                    approved_by: req.user.id,
                    status: d.status,
                    notes: d.notes || null,
                }, { transaction: t });
            }
        }
        await t.commit();
        await (0, audit_1.logAudit)(req.user.id, 'draft.review', `${draft.code} · ${decisions.length} item`, req.ip);
        const io = req.app.get('io');
        if (io) {
            io.emit('data_changed', { type: 'draft' });
            io.emit('notification', {
                message: `Review item draf ${draft.code} telah diperbarui oleh Kaprodi.`,
                roles: ['kalab'],
                kind: 'info',
            });
        }
        res.json({ message: 'Review berhasil disimpan.' });
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
exports.finalizeDraft = (0, asyncHandler_1.default)(async (req, res) => {
    const t = await database_1.default.transaction();
    try {
        const draft = await models_1.Draft.findByPk(req.params.id, {
            include: [
                { model: models_1.DraftItem, as: 'items', include: [{ model: models_1.DraftApproval, as: 'approval' }] },
            ],
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!draft) {
            await t.rollback();
            throw new errors_1.NotFoundError('Draf tidak ditemukan.');
        }
        if (draft.status !== 'submitted') {
            await t.rollback();
            throw new errors_1.BadRequestError('Draf belum disubmit atau sudah difinalisasi.');
        }
        if (draft.items.length === 0) {
            await t.rollback();
            throw new errors_1.BadRequestError('Draf tidak memiliki item untuk difinalisasi.');
        }
        const unapprovedItems = draft.items.filter((item) => !item.approval || item.approval.status !== 'approved');
        if (unapprovedItems.length > 0) {
            await t.rollback();
            throw new errors_1.BadRequestError(`Terdapat ${unapprovedItems.length} item yang belum disetujui. Semua item harus disetujui sebelum finalisasi.`);
        }
        draft.status = 'finalized';
        draft.finalized_at = new Date();
        draft.finalized_by = req.user.id;
        await draft.save({ transaction: t });
        await t.commit();
        await (0, audit_1.logAudit)(req.user.id, 'draft.finalize', draft.code, req.ip);
        const io = req.app.get('io');
        if (io) {
            io.emit('data_changed', { type: 'draft' });
            io.emit('notification', {
                message: `Draf pengadaan ${draft.code} telah disetujui & difinalisasi oleh Kaprodi. Siap diterima oleh Admin!`,
                roles: ['kalab', 'admin'],
                kind: 'ok',
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
exports.getDraftHistory = (0, asyncHandler_1.default)(async (req, res) => {
    const { page, limit } = req.query;
    const parsedLimit = Math.min(parseInt(limit) || 200, 1000);
    const parsedPage = Math.max(parseInt(page) || 1, 1);
    const offset = (parsedPage - 1) * parsedLimit;
    const { count, rows } = await models_1.Draft.findAndCountAll({
        where: { status: { [sequelize_1.Op.in]: ['finalized', 'completed'] } },
        include: [
            { model: models_1.User, as: 'creator', attributes: ['id', 'name', 'initials'] },
            { model: models_1.User, as: 'finalizer', attributes: ['id', 'name'] },
            { model: models_1.DraftItem, as: 'items', include: [{ model: models_1.DraftApproval, as: 'approval' }] },
        ],
        order: [['finalized_at', 'DESC']],
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
exports.requestRevision = (0, asyncHandler_1.default)(async (req, res) => {
    const t = await database_1.default.transaction();
    try {
        const draft = await models_1.Draft.findByPk(req.params.id, { transaction: t });
        if (!draft) {
            await t.rollback();
            throw new errors_1.NotFoundError('Draf tidak ditemukan.');
        }
        if (draft.status !== 'submitted') {
            await t.rollback();
            throw new errors_1.BadRequestError('Hanya draf yang berstatus "submitted" yang dapat direvisi.');
        }
        const { notes } = req.body;
        if (!notes || notes.trim() === '') {
            await t.rollback();
            throw new errors_1.BadRequestError('Catatan revisi wajib diisi.');
        }
        draft.status = 'revision';
        draft.revision_notes = notes;
        await draft.save({ transaction: t });
        await t.commit();
        await (0, audit_1.logAudit)(req.user.id, 'draft.revision_requested', draft.code, req.ip, notes);
        const io = req.app.get('io');
        if (io) {
            io.emit('data_changed', { type: 'draft' });
            io.emit('notification', {
                message: `Draf pengadaan ${draft.code} membutuhkan revisi: "${notes}"`,
                roles: ['kalab'],
                kind: 'warn',
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
