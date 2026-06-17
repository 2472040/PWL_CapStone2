import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

const Inventory = sequelize.define(
  'Inventory',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    room_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'rooms', key: 'id' },
    },
    condition: {
      type: DataTypes.ENUM('Baik', 'Perlu cek', 'Maintenance', 'Rusak'),
      allowNull: false,
      defaultValue: 'Baik',
    },
    last_checked: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    acquired_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    value: {
      type: DataTypes.BIGINT,
      allowNull: true,
      defaultValue: 0,
    },
    serial: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    specs: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'inventory',
    paranoid: true,
    deletedAt: 'deleted_at',
    indexes: [
      { fields: ['room_id'] },
      { fields: ['category'] },
      { fields: ['condition'] },
      { fields: ['deleted_at'] },
    ],
  }
) as any;

export default Inventory;
