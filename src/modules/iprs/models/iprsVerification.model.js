const { DataTypes } = require('sequelize');

const VERIFICATION_TYPES = ['ID_CARD', 'PASSPORT', 'ALIEN_CARD', 'BIRTH_CERTIFICATE', 'DEATH_CERTIFICATE', 'PIN'];
const VERIFICATION_STATUSES = ['PENDING', 'VERIFIED', 'NOT_VERIFIED', 'NOT_FOUND', 'FAILED', 'TIMEOUT', 'UNAUTHORIZED', 'SERVICE_UNAVAILABLE'];

module.exports = (sequelize) => sequelize.define('IPRSVerification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  requestId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    field: 'request_id'
  },
  memberId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'member_id'
  },
  verificationType: {
    type: DataTypes.ENUM(...VERIFICATION_TYPES),
    allowNull: false,
    field: 'verification_type'
  },
  identifierHash: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'identifier_hash'
  },
  status: {
    type: DataTypes.ENUM(...VERIFICATION_STATUSES),
    allowNull: false,
    defaultValue: 'PENDING'
  },
  iprsErrorCode: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'iprs_error_code'
  },
  iprsResponseStatus: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'iprs_response_status'
  },
  verificationMethod: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'verification_method'
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'verified_at'
  },
  requestedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'requested_by'
  }
}, {
  tableName: 'iprs_verifications',
  underscored: true,
  indexes: [
    { fields: ['request_id'] },
    { fields: ['member_id'] },
    { fields: ['identifier_hash'] },
    { fields: ['status'] },
    { fields: ['created_at'] }
  ]
});

module.exports.VERIFICATION_TYPES = VERIFICATION_TYPES;
module.exports.VERIFICATION_STATUSES = VERIFICATION_STATUSES;
