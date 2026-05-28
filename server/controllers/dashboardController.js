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

    // 1. Average Draft Approval Speed (in hours)
    const finalizedDrafts = await Draft.findAll({
      where: {
        status: { [Op.in]: ['finalized', 'completed'] },
        submitted_at: { [Op.ne]: null },
        finalized_at: { [Op.ne]: null }
      }
    });
    let avgApprovalTimeHours = 0;
    if (finalizedDrafts.length > 0) {
      const totalMs = finalizedDrafts.reduce((sum, d) => {
        const start = new Date(d.submitted_at);
        const end = new Date(d.finalized_at);
        return sum + (end - start);
      }, 0);
      avgApprovalTimeHours = (totalMs / (1000 * 60 * 60)) / finalizedDrafts.length;
    }
    stats.avgApprovalTimeHours = Number(avgApprovalTimeHours.toFixed(1));

    // 2. Top 3 Lowest / Critical Stock BHP items
    const top3LowBhp = await Bhp.findAll({
      where: sequelize.where(
        sequelize.col('stock'),
        Op.lte,
        sequelize.col('min_stock')
      ),
      order: [
        [sequelize.literal('stock / min_stock'), 'ASC']
      ],
      limit: 3
    });
    stats.top3LowBhp = top3LowBhp.map(b => {
      const pct = b.min_stock > 0 ? Math.round((b.stock / b.min_stock) * 100) : 100;
      return {
        id: b.id,
        code: b.code,
        name: b.name,
        category: b.category,
        stock: b.stock,
        min_stock: b.min_stock,
        unit: b.unit,
        pct
      };
    });

    // 3. Maintenance Incident Count / Load per Room (Top 5)
    const maintLogs = await MaintenanceLog.findAll({
      include: [{
        model: Inventory,
        attributes: ['room_id'],
        include: [{
          model: Room,
          attributes: ['id', 'code', 'name']
        }]
      }]
    });
    const roomMaintMap = {};
    maintLogs.forEach(log => {
      const room = log.Inventory?.Room;
      if (room) {
        if (!roomMaintMap[room.code]) {
          roomMaintMap[room.code] = {
            id: room.id,
            code: room.code,
            name: room.name,
            count: 0
          };
        }
        roomMaintMap[room.code].count += 1;
      }
    });
    stats.maintLoadByRoom = Object.values(roomMaintMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

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
