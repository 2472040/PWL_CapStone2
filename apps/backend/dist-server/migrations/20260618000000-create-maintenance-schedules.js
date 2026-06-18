"use strict";
const { DataTypes } = require('sequelize');
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('maintenance_schedules', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            inventory_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: { model: 'inventory', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            title: {
                type: DataTypes.STRING(150),
                allowNull: false,
            },
            frequency_days: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            last_maintenance_date: {
                type: DataTypes.DATEONLY,
                allowNull: true,
            },
            next_maintenance_date: {
                type: DataTypes.DATEONLY,
                allowNull: false,
            },
            status: {
                type: DataTypes.ENUM('scheduled', 'overdue', 'completed'),
                allowNull: false,
                defaultValue: 'scheduled',
            },
            notes: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
            },
        });
        await queryInterface.addIndex('maintenance_schedules', ['inventory_id']);
        await queryInterface.addIndex('maintenance_schedules', ['next_maintenance_date']);
        await queryInterface.addIndex('maintenance_schedules', ['status']);
    },
    down: async (queryInterface) => {
        await queryInterface.dropTable('maintenance_schedules');
    },
};
