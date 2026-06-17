"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const DraftApproval = database_1.default.define('DraftApproval', {
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    draft_item_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'draft_items', key: 'id' },
    },
    approved_by: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('approved', 'rejected'),
        allowNull: false,
    },
    notes: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'draft_approvals',
    indexes: [{ fields: ['draft_item_id'] }, { fields: ['approved_by'] }],
});
exports.default = DraftApproval;
