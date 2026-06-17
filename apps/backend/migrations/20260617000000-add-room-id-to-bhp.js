const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('bhp', 'room_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'rooms', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('bhp', ['room_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('bhp', 'room_id');
  },
};
