const authConfig = require('../../../config/auth.config');

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
  async authenticate(clientId, clientSecret) {
    if (!clientId || !clientSecret) return null;

    if (clientId === authConfig.sessionUsername && clientSecret === authConfig.sessionPassword) {
      return bootstrapClient();
    }

    return null;
  }
}

module.exports = new ClientService();
