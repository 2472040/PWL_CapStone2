const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  target: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  ip: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },
  hash: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  previous_hash: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
}, {
  tableName: 'audit_logs',
});

module.exports = AuditLog;
