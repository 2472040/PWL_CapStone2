const { User, Room, Inventory, Bhp, Draft, DraftItem, MaintenanceLog, AuditLog } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

const getDashboardStats = async (req, res) => {
  try {
    const role = req.user.role;
    const stats = {};

    // Common stats
    stats.totalInventory = await Inventory.count();
    stats.totalRooms = await Room.count();
    stats.totalBhp = await Bhp.count();

    // Inventory by condition
    stats.inventoryByCondition = {
      baik: await Inventory.count({ where: { condition: 'Baik' } }),
      perluCek: await Inventory.count({ where: { condition: 'Perlu cek' } }),
      maintenance: await Inventory.count({ where: { condition: 'Maintenance' } }),
      rusak: await Inventory.count({ where: { condition: 'Rusak' } }),
    };

    // Total inventory value
    const valueResult = await Inventory.sum('value');
    stats.totalValue = valueResult || 0;

    // BHP low stock alerts
    const lowStockBhp = await Bhp.findAll({
      where: sequelize.where(
        sequelize.col('stock'),
        Op.lte,
        sequelize.col('min_stock')
      ),
    });
    stats.lowStockAlerts = lowStockBhp.length;

    // Role-specific stats
    if (role === 'sysadmin') {
      stats.totalUsers = await User.count();
      stats.activeUsers = await User.count({ where: { status: 'active' } });
    }

    if (role === 'kalab' || role === 'kaprodi') {
      stats.pendingDrafts = await Draft.count({ where: { status: 'submitted' } });
      stats.totalDrafts = await Draft.count();
    }

    if (role === 'staflab') {
      const thisMonth = new Date();
      thisMonth.setDate(1);
      stats.maintenanceThisMonth = await MaintenanceLog.count({
        where: { date: { [Op.gte]: thisMonth.toISOString().split('T')[0] } },
      });
    }

    // Recent activity (last 10)
    stats.recentActivity = await AuditLog.findAll({
      include: [{ model: User, attributes: ['id', 'name', 'role'] }],
      order: [['created_at', 'DESC']],
      limit: 10,
    });

    res.json({ data: stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat dashboard.' });
  }
};

module.exports = { getDashboardStats };
