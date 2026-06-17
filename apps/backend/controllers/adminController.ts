import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { User, Room, AuditLog, Inventory } from '../models';
import { logAudit } from '../middleware/audit';
import sequelize from '../config/database';
import asyncHandler from '../utils/asyncHandler';
import { BadRequestError, NotFoundError, ConflictError } from '../utils/errors';

// =============================================
// USERS
// =============================================

export const getUsers = asyncHandler(async (req: any, res: any) => {
  const { page, limit, search } = req.query;
  const parsedLimit = Math.min(parseInt(limit as string) || 200, 1000);
  const parsedPage = Math.max(parseInt(page as string) || 1, 1);
  const offset = (parsedPage - 1) * parsedLimit;

  const where: any = {};
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await User.findAndCountAll({
    where,
    attributes: { exclude: ['password'] },
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
});

export const createUser = asyncHandler(async (req: any, res: any) => {
  const { name, email, password, role, initials } = req.body;

  if (!name || !email || !password || !role) {
    throw new BadRequestError('Semua field wajib diisi.');
  }

  if (password.length < 8) {
    throw new BadRequestError('Password minimal 8 karakter.');
  }

  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw new ConflictError('Email sudah terdaftar.');
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    password: hashed,
    role,
    initials:
      initials ||
      name
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2),
  });

  await logAudit(req.user.id, 'user.create', `${user.name} (${user.role})`, req.ip);
  const io = req.app.get('io');
  if (io) io.emit('data_changed', { type: 'user' });

  const { password: _, ...userData } = user.toJSON();
  res.status(201).json({ data: userData });
});

export const updateUser = asyncHandler(async (req: any, res: any) => {
  const user = await User.findByPk(req.params.id);
  if (!user) throw new NotFoundError('Pengguna tidak ditemukan.');

  const { name, email, role, status, initials, password } = req.body;
  let credentialsChanged = false;
  const diffs: string[] = [];

  if (role && role !== user.role) {
    if (user.id === req.user.id) {
      throw new BadRequestError('Anda tidak diperbolehkan mengubah peran (role) akun sendiri.');
    }
    diffs.push(`Role: ${user.role} ➔ ${role}`);
    credentialsChanged = true;
  }
  if (status && status !== user.status) {
    if (user.id === req.user.id && status !== 'active') {
      throw new BadRequestError('Anda tidak diperbolehkan menonaktifkan akun sendiri.');
    }
    diffs.push(`Status: ${user.status} ➔ ${status}`);
    credentialsChanged = true;
  }
  if (password) {
    if (password.length < 8) {
      throw new BadRequestError('Password minimal 8 karakter.');
    }
    diffs.push(`Password: [Telah diperbarui]`);
    credentialsChanged = true;
  }
  if (name && name !== user.name) {
    diffs.push(`Nama: ${user.name} ➔ ${name}`);
  }
  if (email && email !== user.email) {
    // Cek apakah email baru sudah digunakan oleh pengguna lain
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail && existingEmail.id !== user.id) {
      throw new ConflictError('Email sudah digunakan oleh akun lain.');
    }
    diffs.push(`Email: ${user.email} ➔ ${email}`);
  }
  if (initials && initials !== user.initials) {
    diffs.push(`Inisial: ${user.initials} ➔ ${initials}`);
  }

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

  // Log detailed audit diffs
  const details = diffs.length > 0 ? diffs.join(', ') : 'Tidak ada perubahan field';
  await logAudit(req.user.id, 'user.update', user.name, req.ip, details);

  // Emit WebSocket update
  const io = req.app.get('io');
  if (io) io.emit('data_changed', { type: 'user' });

  const { password: _, ...userData } = user.toJSON();
  res.json({ data: userData });
});

export const deleteUser = asyncHandler(async (req: any, res: any) => {
  const user = await User.findByPk(req.params.id);
  if (!user) throw new NotFoundError('Pengguna tidak ditemukan.');

  if (user.id === req.user.id) {
    throw new BadRequestError(
      'Anda tidak diperbolehkan menghapus atau menonaktifkan akun sendiri.'
    );
  }

  const userName = user.name;

  // Hard delete if never logged in
  if (!user.last_login) {
    await logAudit(req.user.id, 'user.delete', userName, req.ip);
    await user.destroy();

    const io = req.app.get('io');
    if (io) io.emit('data_changed', { type: 'user' });

    return res.json({ message: `Pengguna "${userName}" dihapus secara permanen.` });
  }

  // Soft delete: set status to paused and invalidate tokens
  user.status = 'paused';
  user.token_version = (user.token_version || 0) + 1;
  await user.save();

  await logAudit(req.user.id, 'user.deactivate', userName, req.ip);
  const io = req.app.get('io');
  if (io) io.emit('data_changed', { type: 'user' });

  res.json({ message: `Pengguna "${userName}" dinonaktifkan.` });
});

// =============================================
// ROOMS
// =============================================

export const getRooms = asyncHandler(async (req: any, res: any) => {
  const { page, limit } = req.query;
  const parsedLimit = Math.min(parseInt(limit as string) || 200, 1000);
  const parsedPage = Math.max(parseInt(page as string) || 1, 1);
  const offset = (parsedPage - 1) * parsedLimit;

  const { count, rows } = await Room.findAndCountAll({
    include: [{ model: User, as: 'pic', attributes: ['id', 'name', 'initials'] }],
    order: [['code', 'ASC']],
    limit: parsedLimit,
    offset,
  });

  // Count assets per room using a single SQL query (eliminates N+1 problem)
  const roomIds = rows.map((r: any) => r.id);
  const assetCounts =
    roomIds.length > 0
      ? await Inventory.findAll({
          where: { room_id: roomIds },
          attributes: ['room_id', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
          group: ['room_id'],
          raw: true,
        })
      : [];
  const countMap = assetCounts.reduce((map: any, row: any) => {
    map[row.room_id] = parseInt(row.count, 10);
    return map;
  }, {});

  const data = rows.map((room: any) => ({
    ...room.toJSON(),
    assets: countMap[room.id] || 0,
  }));

  res.json({
    data,
    pagination: {
      total: count,
      page: parsedPage,
      limit: parsedLimit,
      pages: Math.ceil(count / parsedLimit),
    },
  });
});

export const createRoom = asyncHandler(async (req: any, res: any) => {
  const { code, name, floor, capacity, pic_user_id } = req.body;
  if (!code || !name || floor === undefined) {
    throw new BadRequestError('Code, name, dan floor wajib diisi.');
  }

  const room = await Room.create({ code, name, floor, capacity: capacity || 0, pic_user_id });
  await logAudit(req.user.id, 'room.create', room.code, req.ip);
  const io = req.app.get('io');
  if (io) io.emit('data_changed', { type: 'room' });
  res.status(201).json({ data: room });
});

export const updateRoom = asyncHandler(async (req: any, res: any) => {
  const room = await Room.findByPk(req.params.id);
  if (!room) throw new NotFoundError('Ruangan tidak ditemukan.');

  const { code, name, floor, capacity, pic_user_id } = req.body;
  const diffs: string[] = [];

  if (code && code !== room.code) {
    diffs.push(`Kode: ${room.code} ➔ ${code}`);
    room.code = code;
  }
  if (name && name !== room.name) {
    diffs.push(`Nama: ${room.name} ➔ ${name}`);
    room.name = name;
  }
  if (floor !== undefined && floor !== room.floor) {
    diffs.push(`Lantai: ${room.floor} ➔ ${floor}`);
    room.floor = floor;
  }
  if (capacity !== undefined && capacity !== room.capacity) {
    diffs.push(`Kapasitas: ${room.capacity} ➔ ${capacity}`);
    room.capacity = capacity;
  }
  if (pic_user_id !== undefined && pic_user_id !== room.pic_user_id) {
    diffs.push(`PIC ID: ${room.pic_user_id} ➔ ${pic_user_id}`);
    room.pic_user_id = pic_user_id;
  }

  await room.save();

  const details = diffs.length > 0 ? diffs.join(', ') : 'Tidak ada perubahan field';
  await logAudit(req.user.id, 'room.update', room.code, req.ip, details);

  const io = req.app.get('io');
  if (io) io.emit('data_changed', { type: 'room' });

  res.json({ data: room });
});

export const deleteRoom = asyncHandler(async (req: any, res: any) => {
  const room = await Room.findByPk(req.params.id);
  if (!room) throw new NotFoundError('Ruangan tidak ditemukan.');

  // Cek apakah masih ada inventaris yang terhubung ke ruangan ini
  const linkedInventoryCount = await Inventory.count({ where: { room_id: room.id } });
  if (linkedInventoryCount > 0) {
    throw new BadRequestError(
      `Tidak dapat menghapus ruangan "${room.code}" karena masih terdapat ${linkedInventoryCount} item inventaris yang terhubung. Pindahkan atau hapus inventaris terlebih dahulu.`
    );
  }

  await logAudit(req.user.id, 'room.delete', room.code, req.ip);
  await room.destroy();
  const io = req.app.get('io');
  if (io) io.emit('data_changed', { type: 'room' });
  res.json({ message: `Ruangan "${room.code}" dihapus.` });
});

// =============================================
// AUDIT LOGS
// =============================================

export const getAuditLogs = asyncHandler(async (req: any, res: any) => {
  const { page, limit } = req.query;
  const parsedLimit = Math.min(parseInt(limit as string, 10) || 50, 1000);
  const parsedPage = Math.max(parseInt(page as string, 10) || 1, 1);
  const offset = (parsedPage - 1) * parsedLimit;

  const { count, rows } = await AuditLog.findAndCountAll({
    include: [{ model: User, attributes: ['id', 'name', 'role'] }],
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
});

export const verifyAuditChain = asyncHandler(async (req: any, res: any) => {
  const logs = await AuditLog.findAll({
    order: [['id', 'ASC']],
  });

  const secret = process.env.AUDIT_LOG_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('AUDIT_LOG_SECRET wajib diatur di lingkungan produksi.');
  }
  const activeSecret = secret || 'lokalab-default-audit-secret-key-2026';
  let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
  const issues: any[] = [];

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    // Convert DATETIME to unix seconds string to avoid TZ / millisecond formatting issues
    const timeSecs = Math.floor(
      new Date(log.created_at || log.createdAt).getTime() / 1000
    ).toString();

    // Compute expected HMAC hash including details
    const dataToHash = `${previousHash}|${timeSecs}|${log.user_id || ''}|${log.action}|${log.target || ''}|${log.ip || ''}|${log.details || ''}`;
    const computedHash = crypto.createHmac('sha256', activeSecret).update(dataToHash).digest('hex');

    // 1. Verify previous_hash link (except for genesis log if it has null previous_hash)
    if (log.previous_hash && log.previous_hash !== previousHash) {
      issues.push({
        id: log.id,
        action: log.action,
        error: `previous_hash mismatch. Expected link to "${previousHash.substring(0, 10)}...", Got link to "${log.previous_hash.substring(0, 10)}..."`,
      });
    }

    // 2. Verify current log data integrity
    if (log.hash && log.hash !== computedHash) {
      issues.push({
        id: log.id,
        action: log.action,
        error: `Tampering detected: Log data has been modified. Calculated hash: "${computedHash.substring(0, 10)}...", Stored hash: "${log.hash.substring(0, 10)}..."`,
      });
    }

    // Move chain forward using the stored hash if available, otherwise computed
    previousHash = log.hash || computedHash;
  }

  if (issues.length > 0) {
    console.error('\n⚠️🚨 [SECURITY WARNING] DETEKSI MANIPULASI AUDIT LOG! 🚨⚠️');
    console.error(`Ditemukan ${issues.length} masalah integritas data pada audit log.`);
    issues.forEach((issue) => {
      console.error(`  - Log ID ${issue.id} [${issue.action}]: ${issue.error}`);
    });
    console.error('======================================================\n');

    return res.json({
      valid: false,
      issuesCount: issues.length,
      issues,
    });
  }

  res.json({
    valid: true,
    message:
      'Rantai audit log utuh dan terverifikasi secara kriptografis (tidak ada manipulasi data).',
  });
});
