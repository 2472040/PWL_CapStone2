const { MaintenanceLog, MaintenanceBhp, Bhp, Inventory, User } = require('../models');
const { logAudit } = require('../middleware/audit');
const sequelize = require('../config/database');

// =============================================
// DATA MAPPING HELPERS
// =============================================

const mapBhpItem = (b) => {
  if (!b) return null;
  return {
    id: b.code, // Frontend refers to 'B-001' as id
    dbId: b.id, // Actual database auto-increment ID
    code: b.code,
    name: b.name,
    unit: b.unit,
    stock: parseFloat(b.stock),
    min: parseFloat(b.min_stock),
    lastIn: b.last_in,
    cat: b.category
  };
};

const mapMaintenanceLog = (log) => {
  if (!log) return null;
  return {
    id: log.code || `M-${log.id}`,
    dbId: log.id,
    date: log.date,
    name: log.Inventory ? log.Inventory.name : '',
    asset: log.Inventory ? log.Inventory.code : '',
    action: log.action,
    tech: log.technician ? log.technician.name : (log.tech_user_id ? 'Teknisi' : 'Sistem'),
    cond: log.condition_after,
    bhp: (log.bhpUsed || []).map(bu => ({
      id: bu.Bhp ? bu.Bhp.code : (bu.bhp_id ? `B-${bu.bhp_id}` : ''),
      qty: parseFloat(bu.qty_used),
      unit: bu.Bhp ? bu.Bhp.unit : ''
    }))
  };
};

// =============================================
// MAINTENANCE (Staf Lab)
// =============================================

const getMaintenanceLogs = async (req, res) => {
  try {
    const logs = await MaintenanceLog.findAll({
      include: [
        { model: Inventory, attributes: ['id', 'code', 'name'] },
        { model: User, as: 'technician', attributes: ['id', 'name'] },
        { model: MaintenanceBhp, as: 'bhpUsed', include: [{ model: Bhp, attributes: ['id', 'code', 'name', 'unit'] }] },
      ],
      order: [['date', 'DESC']],
    });
    res.json({ data: logs.map(mapMaintenanceLog) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat log maintenance.' });
  }
};

const createMaintenance = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { inventory_id, action, condition_after, date, bhp_used } = req.body;
    if (!inventory_id || !action || !condition_after || !date) {
      return res.status(400).json({ error: 'Semua field wajib diisi.' });
    }

    const inventory = await Inventory.findOne({ where: { code: inventory_id } });
    if (!inventory) return res.status(404).json({ error: 'Item inventaris tidak ditemukan.' });

    // Auto-generate code
    const year = new Date().getFullYear();
    const count = await MaintenanceLog.count() + 1;
    const code = `M-${year}-${String(count).padStart(3, '0')}`;

    const log = await MaintenanceLog.create({
      code,
      inventory_id: inventory.id, // Correct FK integer
      tech_user_id: req.user.id,
      action,
      condition_after,
      date,
    }, { transaction: t });

    // Update inventory condition
    inventory.condition = condition_after;
    inventory.last_checked = new Date();
    await inventory.save({ transaction: t });

    // Deduct BHP stock if used
    if (bhp_used && bhp_used.length > 0) {
      for (const item of bhp_used) {
        // Find Bhp by its code string (like 'B-009')
        const bhp = await Bhp.findOne({ where: { code: item.bhp_id }, transaction: t });
        if (!bhp) continue;

        await MaintenanceBhp.create({
          maintenance_log_id: log.id,
          bhp_id: bhp.id, // Correct FK integer
          qty_used: item.qty,
        }, { transaction: t });

        // Deduct stock
        bhp.stock = Math.max(0, parseFloat(bhp.stock) - parseFloat(item.qty));
        await bhp.save({ transaction: t });
      }
    }

    await t.commit();
    await logAudit(req.user.id, 'maintenance.create', `${inventory.code} — ${action}`, req.ip);

    const result = await MaintenanceLog.findByPk(log.id, {
      include: [
        { model: Inventory, attributes: ['id', 'code', 'name'] },
        { model: User, as: 'technician', attributes: ['id', 'name'] },
        { model: MaintenanceBhp, as: 'bhpUsed', include: [{ model: Bhp }] },
      ],
    });
    res.status(201).json({ data: mapMaintenanceLog(result) });
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.status(500).json({ error: 'Gagal membuat log maintenance.' });
  }
};

// =============================================
// BHP (Staf Lab)
// =============================================

const getBhp = async (req, res) => {
  try {
    const items = await Bhp.findAll({ order: [['code', 'ASC']] });
    res.json({ data: items.map(mapBhpItem) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat data BHP.' });
  }
};

const updateBhp = async (req, res) => {
  try {
    const idOrCode = req.params.id;
    let bhp;
    if (isNaN(idOrCode)) {
      bhp = await Bhp.findOne({ where: { code: idOrCode } });
    } else {
      bhp = await Bhp.findByPk(idOrCode);
    }
    if (!bhp) return res.status(404).json({ error: 'BHP tidak ditemukan.' });

    const { stock, min_stock, last_in, name, unit, category } = req.body;
    if (stock !== undefined) bhp.stock = stock;
    if (min_stock !== undefined) bhp.min_stock = min_stock;
    if (last_in) bhp.last_in = last_in;
    if (name) bhp.name = name;
    if (unit) bhp.unit = unit;
    if (category) bhp.category = category;

    await bhp.save();
    await logAudit(req.user.id, 'bhp.update', `${bhp.code} (stok: ${bhp.stock})`, req.ip);
    res.json({ data: mapBhpItem(bhp) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengupdate BHP.' });
  }
};

const createBhp = async (req, res) => {
  try {
    const { code, name, unit, stock, min_stock, last_in, category } = req.body;
    if (!code || !name || !unit) {
      return res.status(400).json({ error: 'Code, name, dan unit wajib diisi.' });
    }

    const bhp = await Bhp.create({ code, name, unit, stock: stock || 0, min_stock: min_stock || 0, last_in, category });
    await logAudit(req.user.id, 'bhp.create', bhp.code, req.ip);
    res.status(201).json({ data: mapBhpItem(bhp) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menambah BHP.' });
  }
};

module.exports = { getMaintenanceLogs, createMaintenance, getBhp, updateBhp, createBhp };
