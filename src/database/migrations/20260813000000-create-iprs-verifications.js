const verificationTypes = ['ID_CARD', 'PASSPORT', 'ALIEN_CARD', 'BIRTH_CERTIFICATE', 'DEATH_CERTIFICATE', 'PIN'];
const verificationStatuses = ['PENDING', 'VERIFIED', 'NOT_VERIFIED', 'NOT_FOUND', 'FAILED', 'TIMEOUT', 'UNAUTHORIZED', 'SERVICE_UNAVAILABLE'];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('iprs_verifications', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      request_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true
      },
      member_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      verification_type: {
        type: Sequelize.ENUM(...verificationTypes),
        allowNull: false
      },
      identifier_hash: {
        type: Sequelize.STRING,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM(...verificationStatuses),
        allowNull: false,
        defaultValue: 'PENDING'
      },
      iprs_error_code: {
        type: Sequelize.STRING,
        allowNull: true
      },
      iprs_response_status: {
        type: Sequelize.STRING,
        allowNull: true
      },
      verification_method: {
        type: Sequelize.STRING,
        allowNull: true
      },
      verified_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      requested_by: {
        type: Sequelize.UUID,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.addIndex('iprs_verifications', ['request_id']);
    await queryInterface.addIndex('iprs_verifications', ['member_id']);
    await queryInterface.addIndex('iprs_verifications', ['identifier_hash']);
    await queryInterface.addIndex('iprs_verifications', ['status']);
    await queryInterface.addIndex('iprs_verifications', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('iprs_verifications');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_iprs_verifications_verification_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_iprs_verifications_status";');
  }
};
