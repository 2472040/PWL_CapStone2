const { Draft, DraftItem } = require('../models');
const sequelize = require('../models').sequelize;
const { Op } = require('sequelize');

async function createDraftService({ title, items, userId }) {
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

module.exports = {
  createDraftService,
};
