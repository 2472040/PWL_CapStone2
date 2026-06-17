"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const DraftItem = database_1.default.define('DraftItem', {
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    draft_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'drafts', key: 'id' },
    },
    kind: {
        type: sequelize_1.DataTypes.ENUM('Inventaris', 'BHP'),
        allowNull: false,
    },
    name: {
        type: sequelize_1.DataTypes.STRING(200),
        allowNull: false,
    },
    qty: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
    },
    unit: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
    },
    price: {
        type: sequelize_1.DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0,
    },
    link: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: true,
    },
    replaces: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
    },
}, {
    tableName: 'draft_items',
    indexes: [{ fields: ['draft_id'] }],
});
exports.default = DraftItem;
