const { MaintenanceLog, MaintenanceBhp, Bhp, Inventory } = require('../models');
const sequelize = require('../config/database');
const { Op } = require('sequelize');

async function createMaintenanceLog({
  inventory_ids,
  action,
  condition_after,
  date,
  bhp_used,
  userId,
}) {
  const t = await sequelize.transaction();
  try {
    const logsCreated = [];
    const inventoryCodes = [];

    // Initial count for code generation
    const year = new Date().getFullYear();
    const lastLog = await MaintenanceLog.findOne({
      where: {
        code: {
          [Op.like]: `M-${year}-%`,
        },
      },
      order: [['code', 'DESC']],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    let startCount = 1;
    if (lastLog && lastLog.code) {
      const match = lastLog.code.match(/M-\d+-(\d+)/);
      if (match) {
        startCount = parseInt(match[1], 10) + 1;
      }
    }

    for (let i = 0; i < inventory_ids.length; i++) {
      const inv_id = inventory_ids[i];
      const inventory = await Inventory.findByPk(inv_id, { transaction: t });
      if (!inventory) continue;

      inventoryCodes.push(inventory.code);

      const code = `M-${year}-${String(startCount + logsCreated.length).padStart(3, '0')}`;

      const log = await MaintenanceLog.create(
        {
          code,
          inventory_id: inv_id,
          tech_user_id: userId,
          action,
          condition_after,
          date,
        },
        { transaction: t }
      );

      logsCreated.push(log);

      inventory.condition = condition_after;
      inventory.last_checked = new Date();
      await inventory.save({ transaction: t });
    }

    if (logsCreated.length === 0) {
      throw new Error('Item inventaris tidak ditemukan.');
    }

    if (bhp_used && bhp_used.length > 0) {
      const totalBhpUsage = {};

      for (const item of bhp_used) {
        const log = logsCreated.find((l) => {
          const invCode = inventoryCodes[logsCreated.indexOf(l)];
          return invCode === item.asset_code;
        });

        if (log && item.qty > 0) {
          await MaintenanceBhp.create(
            {
              maintenance_log_id: log.id,
              bhp_id: item.bhp_id,
              qty_used: parseFloat(item.qty),
            },
            { transaction: t }
          );

          if (!totalBhpUsage[item.bhp_id]) totalBhpUsage[item.bhp_id] = 0;
          totalBhpUsage[item.bhp_id] += parseFloat(item.qty);
        }
      }

      for (const bhp_id of Object.keys(totalBhpUsage)) {
        const bhp = await Bhp.findByPk(bhp_id, { transaction: t });
        if (bhp) {
          bhp.stock = Math.max(0, parseFloat(bhp.stock) - totalBhpUsage[bhp_id]);
          await bhp.save({ transaction: t });
        }
      }
    }

    await t.commit();

    return { logsCreated, inventoryCodes };
  } catch (err) {
    try {
      await t.rollback();
    } catch (rollbackErr) {}
    throw err;
  }
}

module.exports = {
  createMaintenanceLog,
};
