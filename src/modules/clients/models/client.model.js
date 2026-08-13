const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Client', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  clientId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'client_id'
  },
  clientSecretHash: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'client_secret_hash'
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'SUSPENDED', 'REVOKED'),
    allowNull: false,
    defaultValue: 'ACTIVE'
  },
  allowedOperations: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    field: 'allowed_operations'
  },
  rateLimit: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100,
    field: 'rate_limit'
  }
}, {
  tableName: 'clients',
  underscored: true,
  indexes: [
    { unique: true, fields: ['client_id'] },
    { fields: ['status'] }
  ]
});
