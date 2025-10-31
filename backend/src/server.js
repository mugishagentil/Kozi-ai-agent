const app = require('./app');
const logger = require('./utils/logger');
const { connectPrisma } = require('./utils/prisma');

const port = process.env.port || process.env.PORT || 5050;

// Initialize Prisma connection before starting the server
async function startServer() {
  try {
    // Connect to database first
    await connectPrisma();
    
    // Start the server
    app.listen(port, () => {
      console.log(`API running on: http://localhost:${port}`);
      logger.info({ msg: `API running on :${port}` });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    logger.error({ msg: 'Failed to start server', error });
    process.exit(1);
  }
}

startServer();
