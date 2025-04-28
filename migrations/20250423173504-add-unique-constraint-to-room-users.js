'use strict';

const tableName = 'room_users';
const uniqueConstraintName = 'room_users_user_id_room_id_unique';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addConstraint(tableName, {
      type: 'unique',
      fields: ['user_id', 'room_id'],
      name: uniqueConstraintName,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint(tableName, uniqueConstraintName);
  },
};
