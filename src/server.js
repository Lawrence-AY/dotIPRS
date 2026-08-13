const app = require('./app');
const logger = require('./utils/logger');

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  logger.info({ port }, 'HTTP_SERVER_STARTED');
});
