'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('room_users', 'participant_id', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('room_users', 'joined_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('room_users', 'participant_id');
    await queryInterface.removeColumn('room_users', 'joined_at');
  },
};
