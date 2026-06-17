import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

const AuditLog = sequelize.define(
  'AuditLog',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    details: {
      type: DataTypes.TEXT,
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
  },
  {
    tableName: 'audit_logs',
    indexes: [{ fields: ['user_id'] }, { fields: ['action'] }, { fields: ['created_at'] }],
  }
) as any;

export default AuditLog;
