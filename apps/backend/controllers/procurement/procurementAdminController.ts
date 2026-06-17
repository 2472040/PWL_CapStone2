import { Draft, DraftItem, DraftApproval, Receiving, Inventory, Label, Bhp } from '../../models';
import { logAudit } from '../../middleware/audit';
import asyncHandler from '../../utils/asyncHandler';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import sequelize from '../../config/database';
import { Op } from 'sequelize';

export const getReceiving = asyncHandler(async (req: any, res: any) => {
  const { page, limit } = req.query;
  const parsedLimit = Math.min(parseInt(limit as string) || 200, 1000);
  const parsedPage = Math.max(parseInt(page as string) || 1, 1);
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

export const receiveItem = asyncHandler(async (req: any, res: any) => {
  const t = await sequelize.transaction();
  try {
    const { draft_item_id, received_date, qty_received, notes, code, qr_photo, room_id } = req.body;
    if (!draft_item_id || !received_date) {
      await t.rollback();
      throw new BadRequestError('draft_item_id dan received_date wajib diisi.');
    }

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
        existingBhp.stock =
          (parseFloat(existingBhp.stock) || 0) + parseInt(qty_received || draftItem.qty);
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
    if (t && !(t as any).finished) {
      try {
        await t.rollback();
      } catch (_) {}
    }
    throw err;
  }
});

export const completeDraft = asyncHandler(async (req: any, res: any) => {
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

    const unreceivedItems = draft.items.filter(
      (item: any) =>
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
    if (t && !(t as any).finished) {
      try {
        await t.rollback();
      } catch (_) {}
    }
    throw err;
  }
});
