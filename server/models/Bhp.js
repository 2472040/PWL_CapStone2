const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Bhp = sequelize.define('Bhp', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  unit: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  stock: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  min_stock: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  last_in: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
}, {
  tableName: 'bhp',
});

module.exports = Bhp;
