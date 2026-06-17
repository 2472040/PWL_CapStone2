"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const Label = database_1.default.define('Label', {
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
    label_number: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true,
    },
    qr_data: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    photo_url: {
        type: sequelize_1.DataTypes.TEXT('long'),
        allowNull: true,
    },
}, {
    tableName: 'labels',
    indexes: [{ fields: ['inventory_id'] }],
});
exports.default = Label;
