import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

const Draft = sequelize.define(
  'Draft',
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
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'draft',
    },
    revision_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    submitted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    finalized_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    finalized_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
  },
  {
    tableName: 'drafts',
    indexes: [{ fields: ['created_by'] }, { fields: ['finalized_by'] }, { fields: ['status'] }],
  }
) as any;

export default Draft;
