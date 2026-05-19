const bcrypt = require('bcryptjs');
const { User, Room, AuditLog } = require('../models');
const { logAudit } = require('../middleware/audit');

// =============================================
// USERS
// =============================================

const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']],
    });
    res.json({ data: users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat data pengguna.' });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, email, password, role, initials } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Semua field wajib diisi.' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email sudah terdaftar.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name, email, password: hashed, role,
      initials: initials || name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
    });

    await logAudit(req.user.id, 'user.create', `${user.name} (${user.role})`, req.ip);

    const { password: _, ...userData } = user.toJSON();
    res.status(201).json({ data: userData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal membuat pengguna.' });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });

    const { name, email, role, status, initials, password } = req.body;
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (status) user.status = status;
    if (initials) user.initials = initials;
    if (password) user.password = await bcrypt.hash(password, 10);

    await user.save();
    await logAudit(req.user.id, 'user.update', user.name, req.ip);

    const { password: _, ...userData } = user.toJSON();
    res.json({ data: userData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengupdate pengguna.' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });

    const userName = user.name;
    // Soft delete: set status to paused
    user.status = 'paused';
    await user.save();

    await logAudit(req.user.id, 'user.deactivate', userName, req.ip);
    res.json({ message: `Pengguna "${userName}" dinonaktifkan.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menghapus pengguna.' });
  }
};

// =============================================
// ROOMS
// =============================================

const getRooms = async (req, res) => {
  try {
    const rooms = await Room.findAll({
      include: [{ model: User, as: 'pic', attributes: ['id', 'name', 'initials'] }],
      order: [['code', 'ASC']],
    });

    // Count assets per room
    const { Inventory } = require('../models');
    const data = await Promise.all(rooms.map(async (room) => {
      const assetCount = await Inventory.count({ where: { room_id: room.id } });
      return { ...room.toJSON(), assets: assetCount };
    }));

    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat data ruangan.' });
  }
};

const createRoom = async (req, res) => {
  try {
    const { code, name, floor, capacity, pic_user_id } = req.body;
    if (!code || !name || floor === undefined) {
      return res.status(400).json({ error: 'Code, name, dan floor wajib diisi.' });
    }

    const room = await Room.create({ code, name, floor, capacity: capacity || 0, pic_user_id });
    await logAudit(req.user.id, 'room.create', room.code, req.ip);
    res.status(201).json({ data: room });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal membuat ruangan.' });
  }
};

const updateRoom = async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ error: 'Ruangan tidak ditemukan.' });

    const { code, name, floor, capacity, pic_user_id } = req.body;
    if (code) room.code = code;
    if (name) room.name = name;
    if (floor !== undefined) room.floor = floor;
    if (capacity !== undefined) room.capacity = capacity;
    if (pic_user_id !== undefined) room.pic_user_id = pic_user_id;

    await room.save();
    await logAudit(req.user.id, 'room.update', room.code, req.ip);
    res.json({ data: room });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengupdate ruangan.' });
  }
};

const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ error: 'Ruangan tidak ditemukan.' });

    await logAudit(req.user.id, 'room.delete', room.code, req.ip);
    await room.destroy();
    res.json({ message: `Ruangan "${room.code}" dihapus.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menghapus ruangan.' });
  }
};

// =============================================
// AUDIT LOGS
// =============================================

const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows } = await AuditLog.findAndCountAll({
      include: [{ model: User, attributes: ['id', 'name', 'role'] }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat audit log.' });
  }
};

module.exports = {
  getUsers, createUser, updateUser, deleteUser,
  getRooms, createRoom, updateRoom, deleteRoom,
  getAuditLogs,
};
