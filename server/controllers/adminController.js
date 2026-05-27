const bcrypt = require('bcryptjs');
const crypto = require('crypto');
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
    let credentialsChanged = false;

    if (role && role !== user.role) credentialsChanged = true;
    if (status && status !== user.status) credentialsChanged = true;
    if (password) credentialsChanged = true;

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (status) user.status = status;
    if (initials) user.initials = initials;
    if (password) user.password = await bcrypt.hash(password, 10);

    if (credentialsChanged) {
      user.token_version = (user.token_version || 0) + 1;
    }

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
    // Soft delete: set status to paused and invalidate tokens
    user.status = 'paused';
    user.token_version = (user.token_version || 0) + 1;
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

/**
 * GET /api/audit-logs/verify
 * Verifies integrity of the audit logs chain using HMAC-SHA256
 */
const verifyAuditChain = async (req, res) => {
  try {
    const logs = await AuditLog.findAll({
      order: [['id', 'ASC']],
    });

    const secret = process.env.AUDIT_LOG_SECRET || 'lokalab-default-audit-secret-key-2026';
    let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const issues = [];

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      // Convert DATETIME to unix seconds string to avoid TZ / millisecond formatting issues
      const timeSecs = Math.floor(new Date(log.created_at || log.createdAt).getTime() / 1000).toString();

      // Compute expected HMAC hash
      const dataToHash = `${previousHash}|${timeSecs}|${log.user_id || ''}|${log.action}|${log.target || ''}|${log.ip || ''}`;
      const computedHash = crypto.createHmac('sha256', secret).update(dataToHash).digest('hex');

      // 1. Verify previous_hash link (except for genesis log if it has null previous_hash)
      if (log.previous_hash && log.previous_hash !== previousHash) {
        issues.push({
          id: log.id,
          action: log.action,
          error: `previous_hash mismatch. Expected link to "${previousHash.substring(0, 10)}...", Got link to "${log.previous_hash.substring(0, 10)}..."`
        });
      }

      // 2. Verify current log data integrity
      if (log.hash && log.hash !== computedHash) {
        issues.push({
          id: log.id,
          action: log.action,
          error: `Tampering detected: Log data has been modified. Calculated hash: "${computedHash.substring(0, 10)}...", Stored hash: "${log.hash.substring(0, 10)}..."`
        });
      }

      // Move chain forward using the stored hash if available, otherwise computed
      previousHash = log.hash || computedHash;
    }

    if (issues.length > 0) {
      console.error('\n⚠️🚨 [SECURITY WARNING] DETEKSI MANIPULASI AUDIT LOG! 🚨⚠️');
      console.error(`Ditemukan ${issues.length} masalah integritas data pada audit log.`);
      issues.forEach(issue => {
        console.error(`  - Log ID ${issue.id} [${issue.action}]: ${issue.error}`);
      });
      console.error('======================================================\n');

      return res.json({
        valid: false,
        issuesCount: issues.length,
        issues
      });
    }

    res.json({
      valid: true,
      message: 'Rantai audit log utuh dan terverifikasi secara kriptografis (tidak ada manipulasi data).'
    });
  } catch (err) {
    console.error('[Verify Audit Chain Error]', err);
    res.status(500).json({ error: 'Gagal melakukan verifikasi rantai audit log.' });
  }
};

module.exports = {
  getUsers, createUser, updateUser, deleteUser,
  getRooms, createRoom, updateRoom, deleteRoom,
  getAuditLogs, verifyAuditChain
};
