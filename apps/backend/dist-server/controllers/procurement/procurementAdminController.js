"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeDraft = exports.receiveItem = exports.getReceiving = void 0;
const models_1 = require("../../models");
const audit_1 = require("../../middleware/audit");
const asyncHandler_1 = __importDefault(require("../../utils/asyncHandler"));
const errors_1 = require("../../utils/errors");
const database_1 = __importDefault(require("../../config/database"));
const sequelize_1 = require("sequelize");
exports.getReceiving = (0, asyncHandler_1.default)(async (req, res) => {
    const { page, limit } = req.query;
    const parsedLimit = Math.min(parseInt(limit) || 200, 1000);
    const parsedPage = Math.max(parseInt(page) || 1, 1);
    const offset = (parsedPage - 1) * parsedLimit;
    const { count, rows } = await models_1.Draft.findAndCountAll({
        where: { status: { [sequelize_1.Op.in]: ['finalized', 'completed'] } },
        include: [
            {
                model: models_1.DraftItem,
                as: 'items',
                include: [
                    { model: models_1.DraftApproval, as: 'approval', where: { status: 'approved' }, required: true },
                    { model: models_1.Receiving, as: 'receivings' },
                ],
            },
        ],
        order: [['finalized_at', 'DESC']],
        limit: parsedLimit,
        offset,
        subQuery: false,
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
exports.receiveItem = (0, asyncHandler_1.default)(async (req, res) => {
    const t = await database_1.default.transaction();
    try {
        const { draft_item_id, received_date, qty_received, notes, code, qr_photo, room_id } = req.body;
        if (!draft_item_id || !received_date) {
            await t.rollback();
            throw new errors_1.BadRequestError('draft_item_id dan received_date wajib diisi.');
        }
        const parsedQty = qty_received ? parseInt(qty_received, 10) : null;
        if (parsedQty !== null && parsedQty <= 0) {
            await t.rollback();
            throw new errors_1.BadRequestError('Jumlah diterima (qty_received) harus bernilai positif.');
        }
        const draftItem = await models_1.DraftItem.findByPk(draft_item_id, {
            include: [{ model: models_1.DraftApproval, as: 'approval' }],
            transaction: t,
        });
        if (!draftItem) {
            await t.rollback();
            throw new errors_1.NotFoundError('Item draf tidak ditemukan.');
        }
        if (!draftItem.approval || draftItem.approval.status !== 'approved') {
            await t.rollback();
            throw new errors_1.BadRequestError('Item belum disetujui.');
        }
        const existingReceiving = await models_1.Receiving.findOne({
            where: { draft_item_id },
            transaction: t,
        });
        if (existingReceiving) {
            await t.rollback();
            throw new errors_1.BadRequestError('Item draf ini sudah diterima sebelumnya.');
        }
        const orderedQty = parseInt(draftItem.qty, 10);
        if (parsedQty !== null && parsedQty > orderedQty) {
            await t.rollback();
            throw new errors_1.BadRequestError(`Jumlah diterima (${parsedQty}) tidak boleh melebihi jumlah yang dipesan (${orderedQty}).`);
        }
        const receiving = await models_1.Receiving.create({
            draft_item_id,
            received_by: req.user.id,
            received_date,
            qty_received: qty_received || draftItem.qty,
            notes: req.body.notes,
        }, { transaction: t });
        if (draftItem.kind === 'Inventaris') {
            if (!code || !qr_photo) {
                await t.rollback();
                throw new errors_1.BadRequestError('Kode dan Foto QR wajib untuk inventaris.');
            }
            const inv = await models_1.Inventory.create({
                code,
                name: draftItem.name,
                category: 'Umum',
                condition: req.body.condition || 'Baik',
                acquired_date: received_date,
                value: draftItem.price,
                specs: draftItem.qty + ' ' + draftItem.unit,
                room_id: room_id || null,
            }, { transaction: t });
            await models_1.Label.create({
                inventory_id: inv.id,
                label_number: code,
                qr_data: code,
                photo_url: qr_photo,
            }, { transaction: t });
        }
        else if (draftItem.kind === 'BHP') {
            const existingBhp = await models_1.Bhp.findOne({
                where: { name: draftItem.name },
                transaction: t,
                lock: t.LOCK.UPDATE,
            });
            if (existingBhp) {
                existingBhp.stock =
                    (parseFloat(existingBhp.stock) || 0) + parseInt(qty_received || draftItem.qty);
                await existingBhp.save({ transaction: t });
            }
            else {
                await models_1.Bhp.create({
                    code: 'BHP-' + Date.now(),
                    name: draftItem.name,
                    category: 'Umum',
                    stock: qty_received || draftItem.qty,
                    unit: draftItem.unit,
                }, { transaction: t });
            }
        }
        await (0, audit_1.logAudit)(req.user.id, 'receiving.confirm', `${draftItem.name} · ${qty_received || draftItem.qty} unit`, req.ip);
        await t.commit();
        const io = req.app.get('io');
        if (io)
            io.emit('data_changed', { type: 'draft' });
        res.status(201).json({ data: receiving });
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
exports.completeDraft = (0, asyncHandler_1.default)(async (req, res) => {
    const t = await database_1.default.transaction();
    try {
        const draft = await models_1.Draft.findByPk(req.params.id, {
            include: [
                {
                    model: models_1.DraftItem,
                    as: 'items',
                    include: [
                        {
                            model: models_1.DraftApproval,
                            as: 'approval',
                            where: { status: 'approved' },
                            required: false,
                        },
                        { model: models_1.Receiving, as: 'receivings' },
                    ],
                },
            ],
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!draft) {
            await t.rollback();
            throw new errors_1.NotFoundError('Draf tidak ditemukan.');
        }
        if (draft.status !== 'finalized') {
            await t.rollback();
            throw new errors_1.BadRequestError('Draf belum difinalisasi atau sudah diselesaikan.');
        }
        const unreceivedItems = draft.items.filter((item) => item.approval &&
            item.approval.status === 'approved' &&
            (!item.receivings || item.receivings.length === 0));
        if (unreceivedItems.length > 0) {
            await t.rollback();
            throw new errors_1.BadRequestError(`Terdapat ${unreceivedItems.length} item yang belum diterima. Semua item harus diterima sebelum menyelesaikan draf.`);
        }
        draft.status = 'completed';
        await draft.save({ transaction: t });
        await t.commit();
        await (0, audit_1.logAudit)(req.user.id, 'draft.complete', draft.code, req.ip);
        const io = req.app.get('io');
        if (io)
            io.emit('data_changed', { type: 'draft' });
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
