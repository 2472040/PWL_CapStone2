import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

const DraftApproval = sequelize.define(
  'DraftApproval',
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
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    status: {
      type: DataTypes.ENUM('approved', 'rejected'),
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'draft_approvals',
    indexes: [{ fields: ['draft_item_id'] }, { fields: ['approved_by'] }],
  }
) as any;

export default DraftApproval;
