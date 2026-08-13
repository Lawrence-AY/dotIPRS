const crypto = require('crypto');
const authConfig = require('../../../config/auth.config');

function hashSecret(secret) {
  return crypto.createHash('sha256').update(String(secret)).digest('hex');
}

function bootstrapClient() {
  return {
    id: authConfig.defaultClientId,
    name: authConfig.defaultClientName,
    clientId: authConfig.defaultClientId,
    status: 'ACTIVE',
    allowedOperations: authConfig.defaultAllowedOperations,
    rateLimit: authConfig.defaultRateLimit
  };
}

class ClientService {
  getModel() {
    return require('../../../models').Client;
  }

  async authenticate(clientId, clientSecret) {
    if (!clientId || !clientSecret) return null;

    if (clientId === authConfig.sessionUsername && clientSecret === authConfig.sessionPassword) {
      return bootstrapClient();
    }

    const Client = this.getModel();
    const client = await Client.findOne({ where: { clientId, status: 'ACTIVE' } });
    if (!client) return null;

    const value = client.toJSON();
    if (value.clientSecretHash !== hashSecret(clientSecret)) return null;
    return value;
  }

  async list() {
    const Client = this.getModel();
    return Client.findAll({ attributes: { exclude: ['clientSecretHash'] }, order: [['createdAt', 'DESC']] });
  }

  async create({ name, clientId, clientSecret, allowedOperations = [], rateLimit = 100 }) {
    const Client = this.getModel();
    return Client.create({
      name,
      clientId,
      clientSecretHash: hashSecret(clientSecret),
      allowedOperations,
      rateLimit
    });
  }
}

module.exports = new ClientService();
module.exports.hashSecret = hashSecret;
