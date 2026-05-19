const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Draft = sequelize.define('Draft', {
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
    type: DataTypes.ENUM('draft', 'submitted', 'finalized', 'completed'),
    allowNull: false,
    defaultValue: 'draft',
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
}, {
  tableName: 'drafts',
});

module.exports = Draft;
