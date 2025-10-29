const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const app = require('../app');

const specs = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'KOZI AI API', version: '1.0.0' },
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

app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));

module.exports = { specs };
