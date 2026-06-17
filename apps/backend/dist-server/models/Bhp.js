"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const Bhp = database_1.default.define('Bhp', {
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    code: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
        unique: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING(150),
        allowNull: false,
    },
    unit: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
    },
    stock: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
    },
    min_stock: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
    },
    last_in: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: true,
    },
    category: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true,
    },
    room_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'rooms', key: 'id' },
    },
}, {
    tableName: 'bhp',
});
exports.default = Bhp;
