const { Draft, DraftItem, DraftApproval, Receiving, User } = require('../models');
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
  try {
    const { title, items } = req.body;
    if (!title) return res.status(400).json({ error: 'Judul draf wajib diisi.' });

    const year = new Date().getFullYear();
    const count = await Draft.count() + 1;
    const code = `PRC-${year}-LK${String(count).padStart(2, '0')}`;

    const draft = await Draft.create({ code, title, created_by: req.user.id, status: 'draft' });

    if (items && items.length > 0) {
      const draftItems = items.map(item => ({ ...item, draft_id: draft.id }));
      await DraftItem.bulkCreate(draftItems);
    }

    await logAudit(req.user.id, 'draft.create', code, req.ip);
    const result = await Draft.findByPk(draft.id, { include: [{ model: DraftItem, as: 'items' }] });
    res.status(201).json({ data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal membuat draf pengadaan.' });
  }
};

const updateDraft = async (req, res) => {
  try {
    const draft = await Draft.findByPk(req.params.id);
    if (!draft) return res.status(404).json({ error: 'Draf tidak ditemukan.' });
    if (draft.status !== 'draft') return res.status(400).json({ error: 'Draf sudah tidak dapat diubah.' });
    if (draft.created_by !== req.user.id) return res.status(403).json({ error: 'Anda tidak berhak mengubah draf ini.' });

    if (req.body.title) draft.title = req.body.title;
    await draft.save();

    await logAudit(req.user.id, 'draft.update', draft.code, req.ip);
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
    if (draft.status !== 'draft') return res.status(400).json({ error: 'Draf sudah disubmit.' });
    if (draft.items.length === 0) return res.status(400).json({ error: 'Draf harus memiliki minimal 1 item.' });

    draft.status = 'submitted';
    draft.submitted_at = new Date();
    await draft.save();

    await logAudit(req.user.id, 'draft.submit', draft.code, req.ip);
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
    if (draft.status !== 'draft') return res.status(400).json({ error: 'Draf sudah tidak dapat diubah.' });

    const { kind, name, qty, unit, price, link, replaces } = req.body;
    if (!kind || !name || !qty || !unit || !price) {
      return res.status(400).json({ error: 'Semua field item wajib diisi.' });
    }

    const item = await DraftItem.create({ draft_id: draft.id, kind, name, qty, unit, price, link, replaces });
    await logAudit(req.user.id, 'draft.addItem', `${draft.code} · ${name}`, req.ip);
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
  try {
    const draft = await Draft.findByPk(req.params.id);
    if (!draft) return res.status(404).json({ error: 'Draf tidak ditemukan.' });
    if (draft.status !== 'submitted') return res.status(400).json({ error: 'Draf belum disubmit atau sudah difinalisasi.' });

    const { decisions } = req.body; // [{ item_id, status: 'approved'|'rejected', notes }]
    if (!decisions || !Array.isArray(decisions)) {
      return res.status(400).json({ error: 'Data decisions wajib diisi.' });
    }

    for (const d of decisions) {
      await DraftApproval.upsert({
        draft_item_id: d.item_id,
        approved_by: req.user.id,
        status: d.status,
        notes: d.notes || null,
      });
    }

    await logAudit(req.user.id, 'draft.review', `${draft.code} · ${decisions.length} item`, req.ip);
    res.json({ message: 'Review berhasil disimpan.' });
  } catch (err) {
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
  try {
    const { draft_item_id, received_date, qty_received, notes } = req.body;
    if (!draft_item_id || !received_date) {
      return res.status(400).json({ error: 'draft_item_id dan received_date wajib diisi.' });
    }

    const draftItem = await DraftItem.findByPk(draft_item_id, {
      include: [{ model: DraftApproval, as: 'approval' }],
    });
    if (!draftItem) return res.status(404).json({ error: 'Item draf tidak ditemukan.' });
    if (!draftItem.approval || draftItem.approval.status !== 'approved') {
      return res.status(400).json({ error: 'Item belum disetujui.' });
    }

    const receiving = await Receiving.create({
      draft_item_id, received_by: req.user.id,
      received_date, qty_received: qty_received || draftItem.qty, notes,
    });

    await logAudit(req.user.id, 'receiving.confirm', `${draftItem.name} · ${qty_received || draftItem.qty} unit`, req.ip);
    res.status(201).json({ data: receiving });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mencatat penerimaan.' });
  }
};

const deleteDraftItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const item = await DraftItem.findByPk(itemId, {
      include: [{ model: Draft, as: 'draft' }]
    });
    if (!item) return res.status(404).json({ error: 'Item draf tidak ditemukan.' });
    if (item.draft.status !== 'draft') {
      return res.status(400).json({ error: 'Tidak bisa menghapus item dari draf yang sudah diajukan.' });
    }
    
    const draftCode = item.draft.code;
    const itemName = item.name;
    
    await item.destroy();
    
    await logAudit(req.user.id, 'procurement.remove_item', `${itemName} dari ${draftCode}`, req.ip);
    res.json({ message: 'Item draf berhasil dihapus.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menghapus item draf.' });
  }
};

module.exports = {
  getDrafts, createDraft, updateDraft, submitDraft, addDraftItem, deleteDraftItem,
  getDraftsForReview, approveDraftItems, finalizeDraft, getDraftHistory,
  getReceiving, receiveItem,
};
