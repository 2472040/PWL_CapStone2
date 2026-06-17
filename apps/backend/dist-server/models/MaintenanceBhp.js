"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const MaintenanceBhp = database_1.default.define('MaintenanceBhp', {
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    maintenance_log_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'maintenance_logs', key: 'id' },
    },
    bhp_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'bhp', key: 'id' },
    },
    qty_used: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
    },
}, {
    tableName: 'maintenance_bhp',
    indexes: [{ fields: ['maintenance_log_id'] }, { fields: ['bhp_id'] }],
});
exports.default = MaintenanceBhp;
