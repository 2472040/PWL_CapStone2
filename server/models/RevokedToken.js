const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RevokedToken = sequelize.define('RevokedToken', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  jti: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName: 'revoked_tokens',
  timestamps: true,
  updatedAt: false, // only createdAt is needed
});

module.exports = RevokedToken;
