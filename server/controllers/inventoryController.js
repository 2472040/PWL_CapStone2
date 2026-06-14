const { Inventory, Room, Label, MaintenanceLog, User } = require('../models');
const { Op } = require('sequelize');
const { logAudit } = require('../middleware/audit');
const sequelize = require('../config/database');

const getInventory = async (req, res) => {
  try {
    const { category, room_id, condition, search, page, limit, include_deleted } = req.query;
    const where = {};
    if (category) where.category = category;
    if (room_id) where.room_id = room_id;
    if (condition) where.condition = condition;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } },
      ];
    }

    // Pagination: default 200, max 1000
    const parsedLimit = Math.min(parseInt(limit) || 200, 1000);
    const parsedPage = Math.max(parseInt(page) || 1, 1);
    const offset = (parsedPage - 1) * parsedLimit;

    const findOptions = {
      where,
      include: [
        { model: Room, attributes: ['id', 'code', 'name'] },
        { model: Label, as: 'label' },
      ],
      order: [['code', 'ASC']],
      limit: parsedLimit,
      offset,
    };

    // Opt-in: include soft-deleted items
    if (include_deleted === 'true') {
      findOptions.paranoid = false;
    }

    const { count, rows } = await Inventory.findAndCountAll(findOptions);

    res.json({
      data: rows,
      pagination: {
        total: count,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(count / parsedLimit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat inventaris.' });
  }
};

const getInventoryDetail = async (req, res) => {
  try {
    const item = await Inventory.findByPk(req.params.id, {
      include: [
        { model: Room },
        { model: Label, as: 'label' },
        {
          model: MaintenanceLog,
          as: 'maintenanceLogs',
          include: [{ model: User, as: 'technician', attributes: ['id', 'name'] }],
          limit: 10,
          order: [['date', 'DESC']],
        },
      ],
    });
    if (!item) return res.status(404).json({ error: 'Item tidak ditemukan.' });
    res.json({ data: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat detail.' });
  }
};

const createInventory = async (req, res) => {
  try {
    const { code, name, category, room_id, condition, acquired_date, value, serial, specs } =
      req.body;
    if (!code || !name || !category) {
      return res.status(400).json({ error: 'Code, name, category wajib diisi.' });
    }

    // Pre-check for duplicate code before inserting
    const existingCode = await Inventory.findOne({ where: { code } });
    if (existingCode) {
      return res
        .status(409)
        .json({ error: `Kode inventaris "${code}" sudah digunakan. Gunakan kode yang berbeda.` });
    }
    const item = await Inventory.create({
      code,
      name,
      category,
      room_id,
      condition: condition || 'Baik',
      acquired_date,
      value: value || 0,
      serial,
      specs,
      last_checked: new Date(),
    });

    await logAudit(req.user.id, 'inventory.create', item.code, req.ip);

    const io = req.app.get('io');
    if (io) io.emit('data_changed', { type: 'inventory' });

    res.status(201).json({ data: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menambah inventaris.' });
  }
};

const updateInventory = async (req, res) => {
  try {
    const item = await Inventory.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item tidak ditemukan.' });

    const fields = [
      'name',
      'category',
      'room_id',
      'condition',
      'acquired_date',
      'value',
      'serial',
      'specs',
    ];
    const diffs = [];

    fields.forEach((f) => {
      if (req.body[f] !== undefined && req.body[f] !== item[f]) {
        diffs.push(`${f}: ${item[f]} ➔ ${req.body[f]}`);
        item[f] = req.body[f];
      }
    });

    item.last_checked = new Date();
    await item.save();

    const details = diffs.length > 0 ? diffs.join(', ') : 'Tidak ada perubahan field';
    await logAudit(req.user.id, 'inventory.update', item.code, req.ip, details);

    const io = req.app.get('io');
    if (io) io.emit('data_changed', { type: 'inventory' });

    res.json({ data: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal update inventaris.' });
  }
};

const updateLabel = async (req, res) => {
  try {
    const { label_number, qr_data, photo_url } = req.body;
    const item = await Inventory.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item tidak ditemukan.' });
    let label = await Label.findOne({ where: { inventory_id: item.id } });
    let isNew = false;
    if (label) {
      if (label_number) label.label_number = label_number;
      if (qr_data) label.qr_data = qr_data;
      if (photo_url) label.photo_url = photo_url;
      await label.save();
    } else {
      label = await Label.create({ inventory_id: item.id, label_number, qr_data, photo_url });
      isNew = true;
    }

    await logAudit(
      req.user.id,
      isNew ? 'label.create' : 'label.update',
      item.code,
      req.ip,
      `Label: ${label_number || '-'}`
    );

    const io = req.app.get('io');
    if (io) io.emit('data_changed', { type: 'inventory' });

    res.json({ data: label });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal update label.' });
  }
};

const getLabels = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const parsedLimit = Math.min(parseInt(limit) || 200, 1000);
    const parsedPage = Math.max(parseInt(page) || 1, 1);
    const offset = (parsedPage - 1) * parsedLimit;

    const { count, rows } = await Label.findAndCountAll({
      include: [{ model: Inventory, attributes: ['id', 'code', 'name', 'category'] }],
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat label.' });
  }
};

const deleteInventory = async (req, res) => {
  try {
    const item = await Inventory.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item tidak ditemukan.' });

    // Soft delete — marks as deleted but keeps the record for recovery
    await item.destroy();

    await logAudit(req.user.id, 'inventory.delete', item.code, req.ip);

    const io = req.app.get('io');
    if (io) io.emit('data_changed', { type: 'inventory' });

    res.json({
      message: `Inventaris "${item.code}" berhasil dihapus (soft delete). Data masih dapat dipulihkan.`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menghapus inventaris.' });
  }
};

const restoreInventory = async (req, res) => {
  try {
    // paranoid: false allows finding soft-deleted records
    const item = await Inventory.findByPk(req.params.id, { paranoid: false });
    if (!item) return res.status(404).json({ error: 'Item tidak ditemukan.' });
    if (!item.deleted_at) {
      return res.status(400).json({ error: 'Item ini tidak dalam status terhapus.' });
    }

    await item.restore();

    await logAudit(req.user.id, 'inventory.restore', item.code, req.ip);

    const io = req.app.get('io');
    if (io) io.emit('data_changed', { type: 'inventory' });

    res.json({ message: `Inventaris "${item.code}" berhasil dipulihkan.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memulihkan inventaris.' });
  }
};

module.exports = {
  getInventory,
  getInventoryDetail,
  createInventory,
  updateInventory,
  updateLabel,
  getLabels,
  deleteInventory,
  restoreInventory,
};
