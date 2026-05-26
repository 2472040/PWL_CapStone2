const { Inventory, Room, Label, MaintenanceLog, User } = require('../models');
const { Op } = require('sequelize');

const getInventory = async (req, res) => {
  try {
    const { category, room_id, condition, search } = req.query;
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
    const items = await Inventory.findAll({
      where,
      include: [
        { model: Room, attributes: ['id', 'code', 'name'] },
        { model: Label, as: 'label' },
      ],
      order: [['code', 'ASC']],
    });
    res.json({ data: items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat inventaris.' });
  }
};

const getInventoryDetail = async (req, res) => {
  try {
    const idOrCode = req.params.id;
    let item;
    const includeOptions = [
      { model: Room },
      { model: Label, as: 'label' },
      {
        model: MaintenanceLog, as: 'maintenanceLogs',
        include: [
          { model: User, as: 'technician', attributes: ['id', 'name'] },
          { model: MaintenanceBhp, as: 'bhpUsed', include: [{ model: Bhp }] }
        ],
        limit: 10,
        order: [['date', 'DESC']],
      },
    ];

    if (isNaN(idOrCode)) {
      item = await Inventory.findOne({ where: { code: idOrCode }, include: includeOptions });
    } else {
      item = await Inventory.findByPk(idOrCode, { include: includeOptions });
    }

    if (!item) return res.status(404).json({ error: 'Item tidak ditemukan.' });

    // Transform to formatted JSON expected by frontend
    const formattedItem = {
      id: item.id,
      code: item.code,
      name: item.name,
      cat: item.category,
      room: item.Room ? item.Room.code : 'R-301',
      cond: item.condition || 'Baik',
      last: item.last_checked ? new Date(item.last_checked).toLocaleDateString('id-ID') : 'baru saja',
      acquired: item.acquired_date ? item.acquired_date.substring(0, 7) : '',
      value: parseFloat(item.value) || 0,
      serial: item.serial || '',
      specs: item.specs || '',
      Room: item.Room ? { id: item.Room.id, code: item.Room.code, name: item.Room.name } : null,
      label: item.label ? { id: item.label.id, label_number: item.label.label_number, qr_data: item.label.qr_data, photo_url: item.label.photo_url } : null,
      maintenanceLogs: (item.maintenanceLogs || []).map(l => ({
        id: l.code || `M-${l.id}`,
        action: l.action,
        date: l.date,
        tech: l.technician ? l.technician.name : 'Teknisi',
        cond: l.condition_after,
        bhp: (l.bhpUsed || []).map(bu => ({
          id: bu.Bhp ? bu.Bhp.code : (bu.bhp_id ? `B-${bu.bhp_id}` : ''),
          qty: parseFloat(bu.qty_used),
          unit: bu.Bhp ? bu.Bhp.unit : ''
        }))
      }))
    };

    res.json({ data: formattedItem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat detail.' });
  }
};

const createInventory = async (req, res) => {
  try {
    const { code, name, category, room_id, condition, acquired_date, value, serial, specs } = req.body;
    if (!code || !name || !category) {
      return res.status(400).json({ error: 'Code, name, category wajib diisi.' });
    }
    const item = await Inventory.create({
      code, name, category, room_id, condition: condition || 'Baik',
      acquired_date, value: value || 0, serial, specs, last_checked: new Date(),
    });
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
    const fields = ['name', 'category', 'room_id', 'condition', 'acquired_date', 'value', 'serial', 'specs'];
    fields.forEach(f => { if (req.body[f] !== undefined) item[f] = req.body[f]; });
    item.last_checked = new Date();
    await item.save();
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
    if (label) {
      if (label_number) label.label_number = label_number;
      if (qr_data) label.qr_data = qr_data;
      if (photo_url) label.photo_url = photo_url;
      await label.save();
    } else {
      label = await Label.create({ inventory_id: item.id, label_number, qr_data, photo_url });
    }
    res.json({ data: label });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal update label.' });
  }
};

const getLabels = async (req, res) => {
  try {
    const labels = await Label.findAll({
      include: [{ model: Inventory, attributes: ['id', 'code', 'name', 'category'] }],
      order: [['created_at', 'DESC']],
    });
    res.json({ data: labels });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat label.' });
  }
};

module.exports = { getInventory, getInventoryDetail, createInventory, updateInventory, updateLabel, getLabels };
