const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MaintenanceLog = sequelize.define(
  'MaintenanceLog',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    code: {
      type: DataTypes.STRING(30),
      allowNull: true,
      unique: true,
    },
    inventory_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'inventory', key: 'id' },
    },
    tech_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    action: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    condition_after: {
      type: DataTypes.ENUM('Baik', 'Perlu cek', 'Maintenance', 'Rusak'),
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
  },
  {
    tableName: 'maintenance_logs',
    indexes: [{ fields: ['inventory_id'] }, { fields: ['tech_user_id'] }, { fields: ['date'] }],
  }
);

module.exports = MaintenanceLog;
