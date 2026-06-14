const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DraftItem = sequelize.define(
  'DraftItem',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    draft_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'drafts', key: 'id' },
    },
    kind: {
      type: DataTypes.ENUM('Inventaris', 'BHP'),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    qty: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    price: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    link: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    replaces: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: 'draft_items',
  }
);

module.exports = DraftItem;
