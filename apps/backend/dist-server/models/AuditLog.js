"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const AuditLog = database_1.default.define('AuditLog', {
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
    },
    action: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
    },
    target: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
    },
    ip: {
        type: sequelize_1.DataTypes.STRING(45),
        allowNull: true,
    },
    details: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    hash: {
        type: sequelize_1.DataTypes.STRING(64),
        allowNull: true,
    },
    previous_hash: {
        type: sequelize_1.DataTypes.STRING(64),
        allowNull: true,
    },
}, {
    tableName: 'audit_logs',
    indexes: [{ fields: ['user_id'] }, { fields: ['action'] }, { fields: ['created_at'] }],
});
exports.default = AuditLog;
