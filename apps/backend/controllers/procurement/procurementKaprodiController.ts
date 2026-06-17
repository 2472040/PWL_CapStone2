import { Draft, DraftItem, DraftApproval, User } from '../../models';
import { logAudit } from '../../middleware/audit';
import asyncHandler from '../../utils/asyncHandler';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import sequelize from '../../config/database';
import { Op } from 'sequelize';

export const getDraftsForReview = asyncHandler(async (req: any, res: any) => {
  const { page, limit } = req.query;
  const parsedLimit = Math.min(parseInt(limit as string) || 200, 1000);
  const parsedPage = Math.max(parseInt(page as string) || 1, 1);
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

export const approveDraftItems = asyncHandler(async (req: any, res: any) => {
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

    const { decisions } = req.body;
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
    if (t && !(t as any).finished) {
      try {
        await t.rollback();
      } catch (_) {}
    }
    throw err;
  }
});

export const finalizeDraft = asyncHandler(async (req: any, res: any) => {
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

    if (draft.items.length === 0) {
      await t.rollback();
      throw new BadRequestError('Draf tidak memiliki item untuk difinalisasi.');
    }
    const unapprovedItems = draft.items.filter(
      (item: any) => !item.approval || item.approval.status !== 'approved'
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
    if (t && !(t as any).finished) {
      try {
        await t.rollback();
      } catch (_) {}
    }
    throw err;
  }
});

export const getDraftHistory = asyncHandler(async (req: any, res: any) => {
  const { page, limit } = req.query;
  const parsedLimit = Math.min(parseInt(limit as string) || 200, 1000);
  const parsedPage = Math.max(parseInt(page as string) || 1, 1);
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

export const requestRevision = asyncHandler(async (req: any, res: any) => {
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
    if (t && !(t as any).finished) {
      try {
        await t.rollback();
      } catch (_) {}
    }
    throw err;
  }
});
