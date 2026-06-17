import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

const RevokedToken = sequelize.define(
  'RevokedToken',
  {
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
  },
  {
    tableName: 'revoked_tokens',
    timestamps: false,
    indexes: [{ fields: ['expires_at'] }],
  }
) as any;

export default RevokedToken;
