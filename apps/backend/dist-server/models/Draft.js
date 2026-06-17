"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const Draft = database_1.default.define('Draft', {
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    code: {
        type: sequelize_1.DataTypes.STRING(30),
        allowNull: false,
        unique: true,
    },
    title: {
        type: sequelize_1.DataTypes.STRING(200),
        allowNull: false,
    },
    created_by: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
    },
    status: {
        type: sequelize_1.DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'draft',
    },
    revision_notes: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    submitted_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    finalized_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    finalized_by: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
    },
}, {
    tableName: 'drafts',
    indexes: [{ fields: ['created_by'] }, { fields: ['finalized_by'] }, { fields: ['status'] }],
});
exports.default = Draft;
