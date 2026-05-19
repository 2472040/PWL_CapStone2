const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Label = sequelize.define('Label', {
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
  label_number: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  qr_data: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  photo_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
}, {
  tableName: 'labels',
});

module.exports = Label;
