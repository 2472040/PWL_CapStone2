const { User, Room, Inventory, Bhp, Draft, MaintenanceLog, AuditLog } = require('../models');
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
      where: sequelize.where(sequelize.col('stock'), Op.lte, sequelize.col('min_stock')),
    });
    stats.lowStockAlerts = lowStockBhp.length;

    // 1. Average Draft Approval Speed (in hours)
    const finalizedDrafts = await Draft.findAll({
      where: {
        status: { [Op.in]: ['finalized', 'completed'] },
        submitted_at: { [Op.ne]: null },
        finalized_at: { [Op.ne]: null },
      },
    });
    let avgApprovalTimeHours = 0;
    if (finalizedDrafts.length > 0) {
      const totalMs = finalizedDrafts.reduce((sum, d) => {
        const start = new Date(d.submitted_at);
        const end = new Date(d.finalized_at);
        return sum + (end - start);
      }, 0);
      avgApprovalTimeHours = totalMs / (1000 * 60 * 60) / finalizedDrafts.length;
    }
    stats.avgApprovalTimeHours = Number(avgApprovalTimeHours.toFixed(1));

    // 2. Top 3 Lowest / Critical Stock BHP items
    const top3LowBhp = await Bhp.findAll({
      where: sequelize.where(sequelize.col('stock'), Op.lte, sequelize.col('min_stock')),
      order: [
        [sequelize.literal('CASE WHEN min_stock > 0 THEN stock / min_stock ELSE stock END'), 'ASC'],
      ],
      limit: 3,
    });
    stats.top3LowBhp = top3LowBhp.map((b) => {
      const pct = b.min_stock > 0 ? Math.round((b.stock / b.min_stock) * 100) : 100;
      return {
        id: b.id,
        code: b.code,
        name: b.name,
        category: b.category,
        stock: b.stock,
        min_stock: b.min_stock,
        unit: b.unit,
        pct,
      };
    });

    // 3. Maintenance Incident Count / Load per Room (Top 5) — management roles only
    if (['sysadmin', 'kalab', 'admin'].includes(role)) {
      const maintLogs = await MaintenanceLog.findAll({
        include: [
          {
            model: Inventory,
            attributes: ['room_id'],
            include: [
              {
                model: Room,
                attributes: ['id', 'code', 'name'],
              },
            ],
          },
        ],
      });
      const roomMaintMap = {};
      maintLogs.forEach((log) => {
        const room = log.Inventory?.Room;
        if (room) {
          if (!roomMaintMap[room.code]) {
            roomMaintMap[room.code] = {
              id: room.id,
              code: room.code,
              name: room.name,
              count: 0,
            };
          }
          roomMaintMap[room.code].count += 1;
        }
      });
      stats.maintLoadByRoom = Object.values(roomMaintMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    } else {
      stats.maintLoadByRoom = [];
    }

    // 4. Monthly Financial Analytics — restricted to management/review roles
    if (['sysadmin', 'kalab', 'kaprodi', 'admin'].includes(role)) {
      const last6Months = [];
      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'Mei',
        'Jun',
        'Jul',
        'Agu',
        'Sep',
        'Okt',
        'Nov',
        'Des',
      ];

      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        last6Months.push({
          monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          name: monthNames[d.getMonth()],
          requested: 0,
          approved: 0,
          saved: 0,
        });
      }

      // Optimized: single SQL aggregation query instead of loading ALL drafts + items into memory
      const [financialRows] = await sequelize.query(`
      SELECT
        DATE_FORMAT(COALESCE(d.finalized_at, d.submitted_at, d.created_at), '%Y-%m') AS month_key,
        COALESCE(SUM(di.qty * di.price), 0) AS total_requested,
        COALESCE(SUM(CASE WHEN da.status = 'approved' THEN di.qty * di.price ELSE 0 END), 0) AS total_approved
      FROM drafts d
      INNER JOIN draft_items di ON di.draft_id = d.id
      LEFT JOIN draft_approvals da ON da.draft_item_id = di.id
      GROUP BY month_key
      ORDER BY month_key ASC
    `);

      // Map SQL results into the 6-month buckets
      financialRows.forEach((row) => {
        const bucket = last6Months.find((m) => m.monthKey === row.month_key);
        if (bucket) {
          bucket.requested = parseFloat(row.total_requested) || 0;
          bucket.approved = parseFloat(row.total_approved) || 0;
        }
      });

      // Calculate savings
      last6Months.forEach((b) => {
        b.saved = Math.max(0, b.requested - b.approved);
      });

      stats.financialAnalytics = last6Months.map((b) => ({
        month: b.name,
        requested: b.requested,
        approved: b.approved,
        saved: b.saved,
      }));
    } else {
      stats.financialAnalytics = [];
    }

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

    // Recent activity (last 10) — sysadmin only (contains audit log data)
    if (role === 'sysadmin') {
      stats.recentActivity = await AuditLog.findAll({
        include: [{ model: User, attributes: ['id', 'name', 'role'] }],
        order: [['created_at', 'DESC']],
        limit: 10,
      });
    } else {
      stats.recentActivity = [];
    }

    res.json({ data: stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat dashboard.' });
  }
};

module.exports = { getDashboardStats };
