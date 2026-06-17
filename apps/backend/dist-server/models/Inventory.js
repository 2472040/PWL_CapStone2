"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const Inventory = database_1.default.define('Inventory', {
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
    name: {
        type: sequelize_1.DataTypes.STRING(150),
        allowNull: false,
    },
    category: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
    },
    room_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'rooms', key: 'id' },
    },
    condition: {
        type: sequelize_1.DataTypes.ENUM('Baik', 'Perlu cek', 'Maintenance', 'Rusak'),
        allowNull: false,
        defaultValue: 'Baik',
    },
    last_checked: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    acquired_date: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: true,
    },
    value: {
        type: sequelize_1.DataTypes.BIGINT,
        allowNull: true,
        defaultValue: 0,
    },
    serial: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true,
    },
    specs: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
    },
    deleted_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'inventory',
    paranoid: true,
    deletedAt: 'deleted_at',
    indexes: [
        { fields: ['room_id'] },
        { fields: ['category'] },
        { fields: ['condition'] },
        { fields: ['deleted_at'] },
    ],
});
exports.default = Inventory;
