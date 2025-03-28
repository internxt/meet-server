'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.createTable('rooms', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
      },
      max_users_allowed: {
        type: Sequelize.STRING,
      },
      host_id: {
        type: Sequelize.INTEGER,
      },
    });
  },

  async down(queryInterface) {
    return queryInterface.dropTable('rooms');
  },
};
