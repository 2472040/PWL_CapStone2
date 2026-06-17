import { Draft, DraftItem, sequelize } from '../models';
import { Op } from 'sequelize';

interface CreateDraftItemInput {
  kind: 'Inventaris' | 'BHP';
  name: string;
  qty: number;
  unit: string;
  price: number;
  link?: string | null;
  replaces?: string | null;
}

interface CreateDraftParams {
  title: string;
  items: CreateDraftItemInput[];
  userId: number;
}

export async function createDraftService({ title, items, userId }: CreateDraftParams) {
  const t = await sequelize.transaction();
  try {
    const year = new Date().getFullYear();
    const lastDraft = await Draft.findOne({
      where: {
        code: {
          [Op.like]: `PRC-${year}-LK%`,
        },
      },
      order: [['code', 'DESC']],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
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
      { code, title, created_by: userId, status: 'draft' },
      { transaction: t }
    );

    if (items && items.length > 0) {
      const draftItems = items.map((item) => ({ ...item, draft_id: draft.id }));
      await DraftItem.bulkCreate(draftItems, { transaction: t });
    }

    await t.commit();

    return { draft, code };
  } catch (err) {
    try {
      await t.rollback();
    } catch (rollbackErr) {}
    throw err;
  }
}

export default {
  createDraftService,
};
