import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

const MaintenanceSchedule = sequelize.define(
  'MaintenanceSchedule',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    inventory_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'inventory', key: 'id' },
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    frequency_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    last_maintenance_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    next_maintenance_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'overdue', 'completed'),
      allowNull: false,
      defaultValue: 'scheduled',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'maintenance_schedules',
    indexes: [
      { fields: ['inventory_id'] },
      { fields: ['next_maintenance_date'] },
      { fields: ['status'] },
    ],
  }
) as any;

export default MaintenanceSchedule;
