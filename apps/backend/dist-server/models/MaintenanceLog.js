"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const MaintenanceLog = database_1.default.define('MaintenanceLog', {
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    code: {
        type: sequelize_1.DataTypes.STRING(30),
        allowNull: true,
        unique: true,
    },
    inventory_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'inventory', key: 'id' },
    },
    tech_user_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
    },
    action: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    condition_after: {
        type: sequelize_1.DataTypes.ENUM('Baik', 'Perlu cek', 'Maintenance', 'Rusak'),
        allowNull: false,
    },
    date: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
    },
}, {
    tableName: 'maintenance_logs',
    indexes: [{ fields: ['inventory_id'] }, { fields: ['tech_user_id'] }, { fields: ['date'] }],
});
exports.default = MaintenanceLog;
