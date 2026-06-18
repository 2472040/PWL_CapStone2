"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const MaintenanceSchedule = database_1.default.define('MaintenanceSchedule', {
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    inventory_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'inventory', key: 'id' },
    },
    title: {
        type: sequelize_1.DataTypes.STRING(150),
        allowNull: false,
    },
    frequency_days: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    last_maintenance_date: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: true,
    },
    next_maintenance_date: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('scheduled', 'overdue', 'completed'),
        allowNull: false,
        defaultValue: 'scheduled',
    },
    notes: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'maintenance_schedules',
    indexes: [
        { fields: ['inventory_id'] },
        { fields: ['next_maintenance_date'] },
        { fields: ['status'] },
    ],
});
exports.default = MaintenanceSchedule;
