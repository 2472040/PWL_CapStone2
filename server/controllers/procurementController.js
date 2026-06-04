const { Draft, DraftItem, DraftApproval, Receiving, User, sequelize } = require('../models');
const { logAudit } = require('../middleware/audit');
const { Op } = require('sequelize');

// =============================================
// KALAB — Pengadaan
// =============================================

const getDrafts = async (req, res) => {
  try {
    const where = {};
    if (req.user.role === 'kalab') where.created_by = req.user.id;
    if (req.query.status) where.status = req.query.status;

    const drafts = await Draft.findAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'initials', 'role'] },
        { model: DraftItem, as: 'items', include: [{ model: DraftApproval, as: 'approval' }] },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json({ data: drafts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat data pengadaan.' });
  }
};

const createDraft = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { title, items } = req.body;

    const year = new Date().getFullYear();
    const lastDraft = await Draft.findOne({ order: [['id', 'DESC']], transaction: t });
    let count = 1;
    if (lastDraft && lastDraft.code) {
      const match = lastDraft.code.match(/LK(\d+)$/);
      if (match) {
        count = parseInt(match[1], 10) + 1;
      } else {
        count = lastDraft.id + 1;
      }
    }
    const code = `PRC-${year}-LK${String(count).padStart(2, '0')}`;

    const draft = await Draft.create(
      { code, title, created_by: req.user.id, status: 'draft' },
      { transaction: t }
    );

    if (items && items.length > 0) {
      const draftItems = items.map(item => ({ ...item, draft_id: draft.id }));
      await DraftItem.bulkCreate(draftItems, { transaction: t });
    }

    await t.commit();

    await logAudit(req.user.id, 'draft.create', code, req.ip);
    const io = req.app.get('io');
    if (io) io.emit('data_changed', { type: 'draft' });
    const result = await Draft.findByPk(draft.id, { include: [{ model: DraftItem, as: 'items' }] });
    res.status(201).json({ data: result });
  } catch (err) {
    console.error('INITIAL ERROR IN CREATEDRAFT:', err);
    try {
      if (t && !t.finished) {
        await t.rollback();
      }
    } catch (rollbackErr) {
      console.error('FAILED TO ROLLBACK TRANSACTION:', rollbackErr.message);
    }
    res.status(500).json({ error: 'Gagal membuat draf pengadaan.' });
  }
};

const updateDraft = async (req, res) => {
  try {
    const draft = await Draft.findByPk(req.params.id);
    if (!draft) return res.status(404).json({ error: 'Draf tidak ditemukan.' });
    if (draft.status !== 'draft' && draft.status !== 'revision') return res.status(400).json({ error: 'Draf sudah tidak dapat diubah.' });
    if (draft.created_by !== req.user.id) return res.status(403).json({ error: 'Anda tidak berhak mengubah draf ini.' });

    if (req.body.title) draft.title = req.body.title;
    await draft.save();

    await logAudit(req.user.id, 'draft.update', draft.code, req.ip);
    const io = req.app.get('io');
    if (io) io.emit('data_changed', { type: 'draft' });
    res.json({ data: draft });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengupdate draf.' });
  }
};

const submitDraft = async (req, res) => {
  try {
    const draft = await Draft.findByPk(req.params.id, { include: [{ model: DraftItem, as: 'items' }] });
    if (!draft) return res.status(404).json({ error: 'Draf tidak ditemukan.' });
    if (draft.status !== 'draft' && draft.status !== 'revision') return res.status(400).json({ error: 'Draf sudah disubmit.' });
    if (draft.items.length === 0) return res.status(400).json({ error: 'Draf harus memiliki minimal 1 item.' });

    draft.status = 'submitted';
    draft.submitted_at = new Date();
    draft.revision_notes = null; // Clear revision notes upon re-submission
    await draft.save();

    await logAudit(req.user.id, 'draft.submit', draft.code, req.ip);
    const io = req.app.get('io');
    if (io) {
      io.emit('data_changed', { type: 'draft' });
      io.emit('notification', {
        message: `Draf pengadaan baru ${draft.code} - "${draft.title}" telah diajukan oleh Kepala Lab.`,
        roles: ['kaprodi'],
        kind: 'info'
      });
    }
    res.json({ data: draft });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengirim draf.' });
  }
};

const addDraftItem = async (req, res) => {
  try {
    const draft = await Draft.findByPk(req.params.id);
    if (!draft) return res.status(404).json({ error: 'Draf tidak ditemukan.' });
    if (draft.status !== 'draft' && draft.status !== 'revision' && draft.status !== 'submitted') return res.status(400).json({ error: 'Draf sudah tidak dapat diubah.' });

    const { kind, name, qty, unit, price, link, replaces } = req.body;
    if (!kind || !name || !qty || !unit || !price) {
      return res.status(400).json({ error: 'Semua field item wajib diisi.' });
    }

    const item = await DraftItem.create({ draft_id: draft.id, kind, name, qty, unit, price, link, replaces });
    await logAudit(req.user.id, 'draft.addItem', `${draft.code} · ${name}`, req.ip);
    const io = req.app.get('io');
    if (io) io.emit('data_changed', { type: 'draft' });
    res.status(201).json({ data: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menambah item.' });
  }
};

// =============================================
// KAPRODI — Review & Finalize
// =============================================

const getDraftsForReview = async (req, res) => {
  try {
    const drafts = await Draft.findAll({
      where: { status: 'submitted' },
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'initials', 'role'] },
        { model: DraftItem, as: 'items', include: [{ model: DraftApproval, as: 'approval' }] },
      ],
      order: [['submitted_at', 'DESC']],
    });
    res.json({ data: drafts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat draf untuk review.' });
  }
};

const approveDraftItems = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const draft = await Draft.findByPk(req.params.id, { transaction: t });
    if (!draft) {
      await t.rollback();
      return res.status(404).json({ error: 'Draf tidak ditemukan.' });
    }
    if (draft.status !== 'submitted') {
      await t.rollback();
      return res.status(400).json({ error: 'Draf belum disubmit atau sudah difinalisasi.' });
    }

    const { decisions } = req.body; // [{ item_id, status: 'approved'|'rejected', notes }]
    if (!decisions || !Array.isArray(decisions)) {
      await t.rollback();
      return res.status(400).json({ error: 'Data decisions wajib diisi.' });
    }

    for (const d of decisions) {
      if (d.status === 'delete' || d.status === null) {
        await DraftApproval.destroy({
          where: { draft_item_id: d.item_id },
          transaction: t
        });
        continue;
      }
      
      const existing = await DraftApproval.findOne({
        where: { draft_item_id: d.item_id },
        transaction: t
      });
      
      if (existing) {
        existing.status = d.status;
        existing.approved_by = req.user.id;
        existing.notes = d.notes || null;
        await existing.save({ transaction: t });
      } else {
        await DraftApproval.create({
          draft_item_id: d.item_id,
          approved_by: req.user.id,
          status: d.status,
          notes: d.notes || null,
        }, { transaction: t });
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
        kind: 'info'
      });
    }
    res.json({ message: 'Review berhasil disimpan.' });
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.status(500).json({ error: 'Gagal menyimpan review.' });
  }
};

const finalizeDraft = async (req, res) => {
  try {
    const draft = await Draft.findByPk(req.params.id, {
      include: [{ model: DraftItem, as: 'items', include: [{ model: DraftApproval, as: 'approval' }] }],
    });
    if (!draft) return res.status(404).json({ error: 'Draf tidak ditemukan.' });
    if (draft.status !== 'submitted') return res.status(400).json({ error: 'Draf belum disubmit atau sudah difinalisasi.' });

    draft.status = 'finalized';
    draft.finalized_at = new Date();
    draft.finalized_by = req.user.id;
    await draft.save();

    await logAudit(req.user.id, 'draft.finalize', draft.code, req.ip);
    const io = req.app.get('io');
    if (io) {
      io.emit('data_changed', { type: 'draft' });
      io.emit('notification', {
        message: `Draf pengadaan ${draft.code} telah disetujui & difinalisasi oleh Kaprodi. Siap diterima oleh Admin!`,
        roles: ['kalab', 'admin'],
        kind: 'ok'
      });
    }
    res.json({ data: draft });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memfinalisasi draf.' });
  }
};

const getDraftHistory = async (req, res) => {
  try {
    const drafts = await Draft.findAll({
      where: { status: { [Op.in]: ['finalized', 'completed'] } },
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'initials'] },
        { model: User, as: 'finalizer', attributes: ['id', 'name'] },
        { model: DraftItem, as: 'items', include: [{ model: DraftApproval, as: 'approval' }] },
      ],
      order: [['finalized_at', 'DESC']],
    });
    res.json({ data: drafts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat riwayat draf.' });
  }
};

// =============================================
// ADMIN — Receiving
// =============================================

const getReceiving = async (req, res) => {
  try {
    const finalized = await Draft.findAll({
      where: { status: { [Op.in]: ['finalized', 'completed'] } },
      include: [{
        model: DraftItem, as: 'items',
        include: [
          { model: DraftApproval, as: 'approval', where: { status: 'approved' }, required: true },
          { model: Receiving, as: 'receivings' },
        ],
      }],
      order: [['finalized_at', 'DESC']],
    });
    res.json({ data: finalized });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat data penerimaan.' });
  }
};

const receiveItem = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { draft_item_id, received_date, qty_received, notes, code, qr_photo } = req.body;
    if (!draft_item_id || !received_date) {
      await t.rollback();
      return res.status(400).json({ error: 'draft_item_id dan received_date wajib diisi.' });
    }

    const draftItem = await DraftItem.findByPk(draft_item_id, {
      include: [{ model: DraftApproval, as: 'approval' }],
      transaction: t
    });
    if (!draftItem) {
      await t.rollback();
      return res.status(404).json({ error: 'Item draf tidak ditemukan.' });
    }
    if (!draftItem.approval || draftItem.approval.status !== 'approved') {
      await t.rollback();
      return res.status(400).json({ error: 'Item belum disetujui.' });
    }

    const receiving = await Receiving.create({
      draft_item_id, received_by: req.user.id,
      received_date, qty_received: qty_received || draftItem.qty, notes,
    }, { transaction: t });

    if (draftItem.kind === 'Inventaris') {
      if (!code || !qr_photo) {
        await t.rollback();
        return res.status(400).json({ error: 'Kode dan Foto QR wajib untuk inventaris.' });
      }
      
      const inv = await Inventory.create({
        code,
        name: draftItem.name,
        category: 'Umum',
        condition: 'Baik',
        acquired_date: received_date,
        value: draftItem.price,
        specs: draftItem.qty + ' ' + draftItem.unit
      }, { transaction: t });

      await Label.create({
        inventory_id: inv.id,
        label_number: code,
        qr_data: code,
        photo_url: qr_photo
      }, { transaction: t });

    } else if (draftItem.kind === 'BHP') {
      const existingBhp = await Bhp.findOne({ where: { name: draftItem.name }, transaction: t });
      if (existingBhp) {
        existingBhp.stock += parseInt(qty_received || draftItem.qty);
        await existingBhp.save({ transaction: t });
      } else {
        await Bhp.create({
          code: 'BHP-' + Date.now(),
          name: draftItem.name,
          category: 'Umum',
          stock: qty_received || draftItem.qty,
          unit: draftItem.unit
        }, { transaction: t });
      }
    }

    await logAudit(req.user.id, 'receiving.confirm', `${draftItem.name} · ${qty_received || draftItem.qty} unit`, req.ip, t);
    
    await t.commit();
    const io = req.app.get('io');
    if (io) io.emit('data_changed', { type: 'draft' });
    res.status(201).json({ data: receiving });
  } catch (err) {
    if (t && !t.finished) await t.rollback();
    console.error(err);
    res.status(500).json({ error: 'Gagal mencatat penerimaan: ' + err.message });
  }
};

const deleteDraftItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const item = await DraftItem.findByPk(itemId, {
      include: [{ model: Draft, as: 'draft' }]
    });
    if (!item) return res.status(404).json({ error: 'Item draf tidak ditemukan.' });
    if (item.draft.status !== 'draft' && item.draft.status !== 'revision' && item.draft.status !== 'submitted') {
      return res.status(400).json({ error: 'Tidak bisa menghapus item dari draf yang sudah dikunci.' });
    }
    
    const draftCode = item.draft.code;
    const itemName = item.name;
    
    await item.destroy();
    
    await logAudit(req.user.id, 'procurement.remove_item', `${itemName} dari ${draftCode}`, req.ip);
    const io = req.app.get('io');
    if (io) io.emit('data_changed', { type: 'draft' });
    res.json({ message: 'Item draf berhasil dihapus.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menghapus item draf.' });
  }
};

const updateDraftItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const item = await DraftItem.findByPk(itemId, {
      include: [{ model: Draft, as: 'draft' }]
    });
    if (!item) return res.status(404).json({ error: 'Item draf tidak ditemukan.' });
    if (item.draft.status !== 'draft' && item.draft.status !== 'revision' && item.draft.status !== 'submitted') {
      return res.status(400).json({ error: 'Tidak bisa mengubah item pada draf yang sudah dikunci.' });
    }

    const { kind, name, qty, unit, price, link, replaces } = req.body;
    if (!kind || !name || !qty || !unit || !price) {
      return res.status(400).json({ error: 'Semua field wajib diisi.' });
    }

    item.kind = kind;
    item.name = name;
    item.qty = qty;
    item.unit = unit;
    item.price = price;
    item.link = link || null;
    item.replaces = kind === 'Inventaris' ? (replaces || null) : null;

    await item.save();

    await logAudit(req.user.id, 'draft.updateItem', `${item.draft.code} · ${name}`, req.ip);
    const io = req.app.get('io');
    if (io) io.emit('data_changed', { type: 'draft' });

    res.json({ data: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengubah item draf.' });
  }
};

const completeDraft = async (req, res) => {
  try {
    const draft = await Draft.findByPk(req.params.id);
    if (!draft) return res.status(404).json({ error: 'Draf tidak ditemukan.' });
    if (draft.status !== 'finalized') return res.status(400).json({ error: 'Draf belum difinalisasi atau sudah diselesaikan.' });

    draft.status = 'completed';
    await draft.save();

    await logAudit(req.user.id, 'draft.complete', draft.code, req.ip);

    const io = req.app.get('io');
    if (io) io.emit('data_changed', { type: 'draft' });

    res.json({ data: draft });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menyelesaikan draf.' });
  }
};

const requestRevision = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const draft = await Draft.findByPk(req.params.id, { transaction: t });
    if (!draft) {
      await t.rollback();
      return res.status(404).json({ error: 'Draf tidak ditemukan.' });
    }
    if (draft.status !== 'submitted') {
      await t.rollback();
      return res.status(400).json({ error: 'Hanya draf yang berstatus "submitted" yang dapat direvisi.' });
    }

    const { notes } = req.body;
    if (!notes || notes.trim() === '') {
      await t.rollback();
      return res.status(400).json({ error: 'Catatan revisi wajib diisi.' });
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
        kind: 'warn'
      });
    }

    res.json({ data: draft });
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.status(500).json({ error: 'Gagal memproses permintaan revisi draf.' });
  }
};

module.exports = {
  getDrafts, createDraft, updateDraft, submitDraft, addDraftItem, deleteDraftItem, updateDraftItem,
  getDraftsForReview, approveDraftItems, finalizeDraft, getDraftHistory,
  getReceiving, receiveItem, completeDraft, requestRevision
};
