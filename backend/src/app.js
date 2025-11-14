require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const chatRoutes = require('./routes/chat.route');
const adminRouter = require('./routes/admin.route');
const gmailRouter = require('./routes/gmail.route');
const jobsRouter = require('./routes/jobs.route');
const publicChatRouter = require('./routes/publicChat.route');
const { errorHandler } = require('./middlewares/error');
const logger = require('./utils/logger');

const app = express();

const specs = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'Kozi API', version: '1.0.0' },
    servers: [{ url: process.env.API_BASE_URL || 'http://localhost:5050' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.use(helmet());
// Allow local dev frontend and any provided origin via env
const allowedOrigin = process.env.FRONTEND_ORIGIN || true;
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRouter);
app.use('/api/gmail', gmailRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api', publicChatRouter); // Public chatbot - no authentication required

app.use(errorHandler);

process.on('unhandledRejection', (e) => logger.error({ msg: 'unhandledRejection', e }));
process.on('uncaughtException', (e) => logger.error({ msg: 'uncaughtException', e }));

module.exports = app;
