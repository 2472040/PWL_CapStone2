const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MaintenanceBhp = sequelize.define('MaintenanceBhp', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  maintenance_log_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'maintenance_logs', key: 'id' },
  },
  bhp_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'bhp', key: 'id' },
  },
  qty_used: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'maintenance_bhp',
});

module.exports = MaintenanceBhp;
