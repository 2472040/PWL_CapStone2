"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDraftService = createDraftService;
const models_1 = require("../models");
const sequelize_1 = require("sequelize");
async function createDraftService({ title, items, userId }) {
    const t = await models_1.sequelize.transaction();
    try {
        const year = new Date().getFullYear();
        const lastDraft = await models_1.Draft.findOne({
            where: {
                code: {
                    [sequelize_1.Op.like]: `PRC-${year}-LK%`,
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
            }
            else {
                count = lastDraft.id + 1;
            }
        }
        const code = `PRC-${year}-LK${String(count).padStart(2, '0')}`;
        const draft = await models_1.Draft.create({ code, title, created_by: userId, status: 'draft' }, { transaction: t });
        if (items && items.length > 0) {
            const draftItems = items.map((item) => ({ ...item, draft_id: draft.id }));
            await models_1.DraftItem.bulkCreate(draftItems, { transaction: t });
        }
        await t.commit();
        return { draft, code };
    }
    catch (err) {
        try {
            await t.rollback();
        }
        catch (rollbackErr) { }
        throw err;
    }
}
exports.default = {
    createDraftService,
};
