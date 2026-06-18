import { Draft, DraftItem, DraftApproval, User } from '../../models';
import { logAudit } from '../../middleware/audit';
import procurementService from '../../services/procurementService';
import asyncHandler from '../../utils/asyncHandler';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/errors';
import sequelize from '../../config/database';
import { clearDashboardCache } from '../../utils/cache';

export const getDrafts = asyncHandler(async (req: any, res: any) => {
  const where: any = {};
  if (req.user.role === 'kalab' || req.user.role === 'staflab') where.created_by = req.user.id;
  if (req.query.status) where.status = req.query.status;

  const { page, limit } = req.query;
  const parsedLimit = Math.min(parseInt(limit as string) || 200, 1000);
  const parsedPage = Math.max(parseInt(page as string) || 1, 1);
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

export const createDraft = asyncHandler(async (req: any, res: any) => {
  const { title, items } = req.body;

  const { draft, code } = await procurementService.createDraftService({
    title,
    items,
    userId: req.user.id,
  });

  await logAudit(req.user.id, 'draft.create', code, req.ip);
  const io = req.app.get('io');
  if (io) io.emit('data_changed', { type: 'draft' });
  clearDashboardCache().catch((err) =>
    console.warn('[Cache] Failed to invalidate dashboard cache:', err.message)
  );
  const result = await Draft.findByPk(draft.id, { include: [{ model: DraftItem, as: 'items' }] });
  res.status(201).json({ data: result });
});

export const updateDraft = asyncHandler(async (req: any, res: any) => {
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
  clearDashboardCache().catch((err) =>
    console.warn('[Cache] Failed to invalidate dashboard cache:', err.message)
  );
  res.json({ data: draft });
});

export const submitDraft = asyncHandler(async (req: any, res: any) => {
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
    draft.revision_notes = null;
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
    clearDashboardCache().catch((err) =>
      console.warn('[Cache] Failed to invalidate dashboard cache:', err.message)
    );
    res.json({ data: draft });
  } catch (err) {
    if (t && !(t as any).finished) {
      try {
        await t.rollback();
      } catch (_) {}
    }
    throw err;
  }
});

export const addDraftItem = asyncHandler(async (req: any, res: any) => {
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
  clearDashboardCache().catch((err) =>
    console.warn('[Cache] Failed to invalidate dashboard cache:', err.message)
  );
  res.status(201).json({ data: item });
});

export const deleteDraftItem = asyncHandler(async (req: any, res: any) => {
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
  clearDashboardCache().catch((err) =>
    console.warn('[Cache] Failed to invalidate dashboard cache:', err.message)
  );
  res.json({ message: 'Item draf berhasil dihapus.' });
});

export const updateDraftItem = asyncHandler(async (req: any, res: any) => {
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
  clearDashboardCache().catch((err) =>
    console.warn('[Cache] Failed to invalidate dashboard cache:', err.message)
  );

  res.json({ data: item });
});
