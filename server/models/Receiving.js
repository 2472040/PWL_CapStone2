const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Receiving = sequelize.define(
  'Receiving',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    draft_item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'draft_items', key: 'id' },
    },
    received_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    received_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    qty_received: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'receiving',
    indexes: [{ fields: ['draft_item_id'] }, { fields: ['received_by'] }],
  }
);

module.exports = Receiving;
