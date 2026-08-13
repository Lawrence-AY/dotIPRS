const { Sequelize } = require('sequelize');
const databaseConfig = require('../config/database.config');
const defineIPRSVerification = require('../modules/iprs/models/iprsVerification.model');
const defineClient = require('../modules/clients/models/client.model');

const env = process.env.NODE_ENV || 'development';
const config = databaseConfig[env] || databaseConfig.development;

const sequelize = config.url
  ? new Sequelize(config.url, config)
  : new Sequelize(config.database, config.username, config.password, config);

const models = {
  Client: defineClient(sequelize),
  IPRSVerification: defineIPRSVerification(sequelize)
};

Object.values(models).forEach((model) => {
  if (typeof model.associate === 'function') model.associate(models);
});

module.exports = {
  sequelize,
  Sequelize,
  ...models
};
