const {
  Draft,
  DraftItem,
  DraftApproval,
  Receiving,
  User,
  Inventory,
  Label,
  Bhp,
  sequelize,
} = require('../models');
const { logAudit } = require('../middleware/audit');
const { Op } = require('sequelize');
const procurementService = require('../services/procurementService');
const asyncHandler = require('../utils/asyncHandler');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/errors');

// =============================================
// KALAB — Pengadaan
// =============================================

const getDrafts = asyncHandler(async (req, res) => {
  const where = {};
  if (req.user.role === 'kalab' || req.user.role === 'staflab') where.created_by = req.user.id;
  if (req.query.status) where.status = req.query.status;

  const { page, limit } = req.query;
  const parsedLimit = Math.min(parseInt(limit) || 200, 1000);
  const parsedPage = Math.max(parseInt(page) || 1, 1);
  const offset = (parsedPage - 1) * parsedLimit;

  const { count, rows } = await Draft.findAndCountAll({
    where,
    include: [
      { model: User, as: 'creator', attributes: ['id', 'name', 'initials', 'role'] },
      { model: DraftItem, as: 'items', include: [{ model: DraftApproval, as: 'approval' }] },
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

const createDraft = asyncHandler(async (req, res) => {
  const { title, items } = req.body;

  const { draft, code } = await procurementService.createDraftService({
    title,
    items,
    userId: req.user.id,
  });

  await logAudit(req.user.id, 'draft.create', code, req.ip);
  const io = req.app.get('io');
  if (io) io.emit('data_changed', { type: 'draft' });
  const result = await Draft.findByPk(draft.id, { include: [{ model: DraftItem, as: 'items' }] });
  res.status(201).json({ data: result });
});

const updateDraft = asyncHandler(async (req, res) => {
  const draft = await Draft.findByPk(req.params.id);
  if (!draft) throw new NotFoundError('Draf tidak ditemukan.');
  if (draft.status !== 'draft' && draft.status !== 'revision')
    throw new BadRequestError('Draf sudah tidak dapat diubah.');
  if (draft.created_by !== req.user.id && req.user.role !== 'kalab')
    throw new ForbiddenError('Anda tidak berhak mengubah draf ini.');

  if (req.body.title) draft.title = req.body.title;
  await draft.save();

  await logAudit(req.user.id, 'draft.update', draft.code, req.ip);
  const io = req.app.get('io');
  if (io) io.emit('data_changed', { type: 'draft' });
  res.json({ data: draft });
});

const submitDraft = asyncHandler(async (req, res) => {
  // Transaction to prevent read-validate-write race on draft status
  const t = await sequelize.transaction();
  try {
    const draft = await Draft.findByPk(req.params.id, {
      include: [{ model: DraftItem, as: 'items' }],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!draft) {
      await t.rollback();
      throw new NotFoundError('Draf tidak ditemukan.');
    }
    if (draft.status !== 'draft' && draft.status !== 'revision') {
      await t.rollback();
      throw new BadRequestError('Draf sudah disubmit.');
    }
    if (draft.created_by !== req.user.id && req.user.role !== 'kalab') {
      await t.rollback();
      throw new ForbiddenError('Anda tidak berhak mengirim draf ini.');
    }
    if (draft.items.length === 0) {
      await t.rollback();
      throw new BadRequestError('Draf harus memiliki minimal 1 item.');
    }

    draft.status = 'submitted';
    draft.submitted_at = new Date();
    draft.revision_notes = null; // Clear revision notes upon re-submission
    await draft.save({ transaction: t });
    await t.commit();

    await logAudit(req.user.id, 'draft.submit', draft.code, req.ip);
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
  } catch (err) {
    if (t && !t.finished) {
      try {
        await t.rollback();
      } catch (_) {
        /* ignore */
      }
    }
    throw err;
  }
});

const addDraftItem = asyncHandler(async (req, res) => {
  const draft = await Draft.findByPk(req.params.id);
  if (!draft) throw new NotFoundError('Draf tidak ditemukan.');
  if (draft.status !== 'draft' && draft.status !== 'revision')
    throw new BadRequestError('Draf sudah tidak dapat diubah.');
  if (draft.created_by !== req.user.id && req.user.role !== 'kalab')
    throw new ForbiddenError('Anda tidak berhak mengubah item pada draf orang lain.');

  const { kind, name, qty, unit, price, link, replaces } = req.body;
  if (!kind || !name || !qty || !unit || !price) {
    throw new BadRequestError('Semua field item wajib diisi.');
  }

  const item = await DraftItem.create({
    draft_id: draft.id,
    kind,
    name,
    qty,
    unit,
    price,
    link,
    replaces,
  });
  await logAudit(req.user.id, 'draft.addItem', `${draft.code} · ${name}`, req.ip);
  const io = req.app.get('io');
  if (io) io.emit('data_changed', { type: 'draft' });
  res.status(201).json({ data: item });
});

// =============================================
// KAPRODI — Review & Finalize
// =============================================

const getDraftsForReview = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const parsedLimit = Math.min(parseInt(limit) || 200, 1000);
  const parsedPage = Math.max(parseInt(page) || 1, 1);
  const offset = (parsedPage - 1) * parsedLimit;

  const { count, rows } = await Draft.findAndCountAll({
    where: { status: 'submitted' },
    include: [
      { model: User, as: 'creator', attributes: ['id', 'name', 'initials', 'role'] },
      { model: DraftItem, as: 'items', include: [{ model: DraftApproval, as: 'approval' }] },
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

const approveDraftItems = asyncHandler(async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const draft = await Draft.findByPk(req.params.id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!draft) {
      await t.rollback();
      throw new NotFoundError('Draf tidak ditemukan.');
    }
    if (draft.status !== 'submitted') {
      await t.rollback();
      throw new BadRequestError('Draf belum disubmit atau sudah difinalisasi.');
    }

    const { decisions } = req.body; // [{ item_id, status: 'approved'|'rejected', notes }]
    if (!decisions || !Array.isArray(decisions)) {
      await t.rollback();
      throw new BadRequestError('Data decisions wajib diisi.');
    }

    for (const d of decisions) {
      if (d.status === 'delete' || d.status === null) {
        await DraftApproval.destroy({
          where: { draft_item_id: d.item_id },
          transaction: t,
        });
        continue;
      }

      const existing = await DraftApproval.findOne({
        where: { draft_item_id: d.item_id },
        transaction: t,
      });

      if (existing) {
        existing.status = d.status;
        existing.approved_by = req.user.id;
        existing.notes = d.notes || null;
        await existing.save({ transaction: t });
      } else {
        await DraftApproval.create(
          {
            draft_item_id: d.item_id,
            approved_by: req.user.id,
            status: d.status,
            notes: d.notes || null,
          },
          { transaction: t }
        );
      }
    }

    await t.commit();

    await logAudit(req.user.id, 'draft.review', `${draft.code} · ${decisions.length} item`, req.ip);
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
  } catch (err) {
    if (t && !t.finished) {
      try {
        await t.rollback();
      } catch (_) {
        /* ignore */
      }
    }
    throw err;
  }
});

const finalizeDraft = asyncHandler(async (req, res) => {
  // Transaction to prevent concurrent approval changes between read and finalize
  const t = await sequelize.transaction();
  try {
    const draft = await Draft.findByPk(req.params.id, {
      include: [
        { model: DraftItem, as: 'items', include: [{ model: DraftApproval, as: 'approval' }] },
      ],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!draft) {
      await t.rollback();
      throw new NotFoundError('Draf tidak ditemukan.');
    }
    if (draft.status !== 'submitted') {
      await t.rollback();
      throw new BadRequestError('Draf belum disubmit atau sudah difinalisasi.');
    }

    // Validasi: semua item harus sudah disetujui (approved) sebelum finalisasi
    if (draft.items.length === 0) {
      await t.rollback();
      throw new BadRequestError('Draf tidak memiliki item untuk difinalisasi.');
    }
    const unapprovedItems = draft.items.filter(
      (item) => !item.approval || item.approval.status !== 'approved'
    );
    if (unapprovedItems.length > 0) {
      await t.rollback();
      throw new BadRequestError(
        `Terdapat ${unapprovedItems.length} item yang belum disetujui. Semua item harus disetujui sebelum finalisasi.`
      );
    }

    draft.status = 'finalized';
    draft.finalized_at = new Date();
    draft.finalized_by = req.user.id;
    await draft.save({ transaction: t });
    await t.commit();

    await logAudit(req.user.id, 'draft.finalize', draft.code, req.ip);
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
  } catch (err) {
    if (t && !t.finished) {
      try {
        await t.rollback();
      } catch (_) {
        /* ignore */
      }
    }
    throw err;
  }
});

const getDraftHistory = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const parsedLimit = Math.min(parseInt(limit) || 200, 1000);
  const parsedPage = Math.max(parseInt(page) || 1, 1);
  const offset = (parsedPage - 1) * parsedLimit;

  const { count, rows } = await Draft.findAndCountAll({
    where: { status: { [Op.in]: ['finalized', 'completed'] } },
    include: [
      { model: User, as: 'creator', attributes: ['id', 'name', 'initials'] },
      { model: User, as: 'finalizer', attributes: ['id', 'name'] },
      { model: DraftItem, as: 'items', include: [{ model: DraftApproval, as: 'approval' }] },
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

// =============================================
// ADMIN — Receiving
// =============================================

const getReceiving = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const parsedLimit = Math.min(parseInt(limit) || 200, 1000);
  const parsedPage = Math.max(parseInt(page) || 1, 1);
  const offset = (parsedPage - 1) * parsedLimit;

  const { count, rows } = await Draft.findAndCountAll({
    where: { status: { [Op.in]: ['finalized', 'completed'] } },
    include: [
      {
        model: DraftItem,
        as: 'items',
        include: [
          { model: DraftApproval, as: 'approval', where: { status: 'approved' }, required: true },
          { model: Receiving, as: 'receivings' },
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

const receiveItem = asyncHandler(async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { draft_item_id, received_date, qty_received, notes, code, qr_photo, room_id } = req.body;
    if (!draft_item_id || !received_date) {
      await t.rollback();
      throw new BadRequestError('draft_item_id dan received_date wajib diisi.');
    }

    // Prevent negative quantity manipulation — qty must be a positive number
    const parsedQty = qty_received ? parseInt(qty_received, 10) : null;
    if (parsedQty !== null && parsedQty <= 0) {
      await t.rollback();
      throw new BadRequestError('Jumlah diterima (qty_received) harus bernilai positif.');
    }

    const draftItem = await DraftItem.findByPk(draft_item_id, {
      include: [{ model: DraftApproval, as: 'approval' }],
      transaction: t,
    });
    if (!draftItem) {
      await t.rollback();
      throw new NotFoundError('Item draf tidak ditemukan.');
    }
    if (!draftItem.approval || draftItem.approval.status !== 'approved') {
      await t.rollback();
      throw new BadRequestError('Item belum disetujui.');
    }

    const existingReceiving = await Receiving.findOne({
      where: { draft_item_id },
      transaction: t,
    });
    if (existingReceiving) {
      await t.rollback();
      throw new BadRequestError('Item draf ini sudah diterima sebelumnya.');
    }

    // Validate qty_received does not exceed ordered quantity
    const orderedQty = parseInt(draftItem.qty, 10);
    if (parsedQty !== null && parsedQty > orderedQty) {
      await t.rollback();
      throw new BadRequestError(
        `Jumlah diterima (${parsedQty}) tidak boleh melebihi jumlah yang dipesan (${orderedQty}).`
      );
    }

    const receiving = await Receiving.create(
      {
        draft_item_id,
        received_by: req.user.id,
        received_date,
        qty_received: qty_received || draftItem.qty,
        notes: req.body.notes,
      },
      { transaction: t }
    );

    if (draftItem.kind === 'Inventaris') {
      if (!code || !qr_photo) {
        await t.rollback();
        throw new BadRequestError('Kode dan Foto QR wajib untuk inventaris.');
      }

      const inv = await Inventory.create(
        {
          code,
          name: draftItem.name,
          category: 'Umum',
          condition: req.body.condition || 'Baik',
          acquired_date: received_date,
          value: draftItem.price,
          specs: draftItem.qty + ' ' + draftItem.unit,
          room_id: room_id || null,
        },
        { transaction: t }
      );

      await Label.create(
        {
          inventory_id: inv.id,
          label_number: code,
          qr_data: code,
          photo_url: qr_photo,
        },
        { transaction: t }
      );
    } else if (draftItem.kind === 'BHP') {
      const existingBhp = await Bhp.findOne({
        where: { name: draftItem.name },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (existingBhp) {
        existingBhp.stock += parseInt(qty_received || draftItem.qty);
        await existingBhp.save({ transaction: t });
      } else {
        await Bhp.create(
          {
            code: 'BHP-' + Date.now(),
            name: draftItem.name,
            category: 'Umum',
            stock: qty_received || draftItem.qty,
            unit: draftItem.unit,
          },
          { transaction: t }
        );
      }
    }

    await logAudit(
      req.user.id,
      'receiving.confirm',
      `${draftItem.name} · ${qty_received || draftItem.qty} unit`,
      req.ip
    );

    await t.commit();
    const io = req.app.get('io');
    if (io) io.emit('data_changed', { type: 'draft' });
    res.status(201).json({ data: receiving });
  } catch (err) {
    if (t && !t.finished) {
      try {
        await t.rollback();
      } catch (_) {
        /* already committed or rolled back */
      }
    }
    throw err;
  }
});

const deleteDraftItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const item = await DraftItem.findByPk(itemId, {
    include: [{ model: Draft, as: 'draft' }],
  });
  if (!item) throw new NotFoundError('Item draf tidak ditemukan.');
  if (item.draft.created_by !== req.user.id && req.user.role !== 'kalab')
    throw new ForbiddenError('Anda tidak berhak menghapus item dari draf orang lain.');
  if (item.draft.status !== 'draft' && item.draft.status !== 'revision') {
    throw new BadRequestError('Tidak bisa menghapus item dari draf yang sudah dikunci.');
  }

  const draftCode = item.draft.code;
  const itemName = item.name;

  await item.destroy();

  await logAudit(req.user.id, 'procurement.remove_item', `${itemName} dari ${draftCode}`, req.ip);
  const io = req.app.get('io');
  if (io) io.emit('data_changed', { type: 'draft' });
  res.json({ message: 'Item draf berhasil dihapus.' });
});

const updateDraftItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const item = await DraftItem.findByPk(itemId, {
    include: [{ model: Draft, as: 'draft' }],
  });
  if (!item) throw new NotFoundError('Item draf tidak ditemukan.');
  if (item.draft.created_by !== req.user.id && req.user.role !== 'kalab')
    throw new ForbiddenError('Anda tidak berhak mengubah item pada draf orang lain.');
  if (item.draft.status !== 'draft' && item.draft.status !== 'revision') {
    throw new BadRequestError('Tidak bisa mengubah item pada draf yang sudah dikunci.');
  }

  const { kind, name, qty, unit, price, link, replaces } = req.body;
  if (!kind || !name || !qty || !unit || !price) {
    throw new BadRequestError('Semua field wajib diisi.');
  }

  item.kind = kind;
  item.name = name;
  item.qty = qty;
  item.unit = unit;
  item.price = price;
  item.link = link || null;
  item.replaces = kind === 'Inventaris' ? replaces || null : null;

  await item.save();

  await logAudit(req.user.id, 'draft.updateItem', `${item.draft.code} · ${name}`, req.ip);
  const io = req.app.get('io');
  if (io) io.emit('data_changed', { type: 'draft' });

  res.json({ data: item });
});

const completeDraft = asyncHandler(async (req, res) => {
  // Transaction to prevent double-complete race condition
  const t = await sequelize.transaction();
  try {
    const draft = await Draft.findByPk(req.params.id, {
      include: [
        {
          model: DraftItem,
          as: 'items',
          include: [
            {
              model: DraftApproval,
              as: 'approval',
              where: { status: 'approved' },
              required: false,
            },
            { model: Receiving, as: 'receivings' },
          ],
        },
      ],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!draft) {
      await t.rollback();
      throw new NotFoundError('Draf tidak ditemukan.');
    }
    if (draft.status !== 'finalized') {
      await t.rollback();
      throw new BadRequestError('Draf belum difinalisasi atau sudah diselesaikan.');
    }

    // Verify all approved items have been received
    const unreceivedItems = draft.items.filter(
      (item) =>
        item.approval &&
        item.approval.status === 'approved' &&
        (!item.receivings || item.receivings.length === 0)
    );
    if (unreceivedItems.length > 0) {
      await t.rollback();
      throw new BadRequestError(
        `Terdapat ${unreceivedItems.length} item yang belum diterima. Semua item harus diterima sebelum menyelesaikan draf.`
      );
    }

    draft.status = 'completed';
    await draft.save({ transaction: t });
    await t.commit();

    await logAudit(req.user.id, 'draft.complete', draft.code, req.ip);

    const io = req.app.get('io');
    if (io) io.emit('data_changed', { type: 'draft' });

    res.json({ data: draft });
  } catch (err) {
    if (t && !t.finished) {
      try {
        await t.rollback();
      } catch (_) {
        /* ignore */
      }
    }
    throw err;
  }
});

const requestRevision = asyncHandler(async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const draft = await Draft.findByPk(req.params.id, { transaction: t });
    if (!draft) {
      await t.rollback();
      throw new NotFoundError('Draf tidak ditemukan.');
    }
    if (draft.status !== 'submitted') {
      await t.rollback();
      throw new BadRequestError('Hanya draf yang berstatus "submitted" yang dapat direvisi.');
    }

    const { notes } = req.body;
    if (!notes || notes.trim() === '') {
      await t.rollback();
      throw new BadRequestError('Catatan revisi wajib diisi.');
    }

    draft.status = 'revision';
    draft.revision_notes = notes;
    await draft.save({ transaction: t });

    await t.commit();

    await logAudit(req.user.id, 'draft.revision_requested', draft.code, req.ip, notes);

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
  } catch (err) {
    if (t && !t.finished) {
      try {
        await t.rollback();
      } catch (_) {
        /* ignore */
      }
    }
    throw err;
  }
});

module.exports = {
  getDrafts,
  createDraft,
  updateDraft,
  submitDraft,
  addDraftItem,
  deleteDraftItem,
  updateDraftItem,
  getDraftsForReview,
  approveDraftItems,
  finalizeDraft,
  getDraftHistory,
  getReceiving,
  receiveItem,
  completeDraft,
  requestRevision,
};
