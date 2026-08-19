require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pinoHttp = require('pino-http');
const authRoutes = require('./modules/auth/routes/auth.routes');
const iprsRoutes = require('./modules/iprs/routes/iprs.routes');
const { requestIdMiddleware } = require('./middlewares/requestId.middleware');
const { errorHandler } = require('./middlewares/error.middleware');
const logger = require('./utils/logger');

const app = express();

// ngrok and similar reverse proxies add X-Forwarded-For. Trust only the
// immediate proxy hop so rate limiting uses the originating client IP.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(requestIdMiddleware);
app.use(pinoHttp({ logger, genReqId: (req) => req.requestId }));

app.get('/health', (req, res) => {
  res.json({ success: true, service: 'IPRS Integration API', status: 'ok' });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/iprs', iprsRoutes);
app.use(errorHandler);

module.exports = app;
