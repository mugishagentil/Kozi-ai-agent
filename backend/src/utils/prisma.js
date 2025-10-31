const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

dotenv.config();

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  console.error('Please set DATABASE_URL in your .env file');
}

// Create a singleton Prisma client instance with proper configuration
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// Handle connection errors gracefully
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    console.log('Query: ' + e.query);
    console.log('Duration: ' + e.duration + 'ms');
  });
}

// Retry connection with exponential backoff
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Add connection health check with retry logic
async function connectPrisma(maxRetries = 5, retryDelay = 2000) {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      console.log(`🔄 Attempting to connect to database (attempt ${retries + 1}/${maxRetries})...`);
      
      // Test connection with a simple query
      await prisma.$connect();
      
      // Verify connection with a simple query
      await prisma.$queryRaw`SELECT 1`;
      
      console.log('✅ Prisma Client connected to database');
      return;
    } catch (error) {
      retries++;
      
      // Check error type
      const isConnectionError = 
        error.code === 'P1017' || // Server has closed the connection
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.message?.includes('Server has closed the connection') ||
        error.message?.includes('Connection closed');
      
      if (retries >= maxRetries) {
        console.error('❌ Failed to connect to database after', maxRetries, 'attempts');
        console.error('Error details:', {
          name: error.name,
          code: error.code,
          message: error.message,
        });
        
        if (!process.env.DATABASE_URL) {
          console.error('\n⚠️  DATABASE_URL is not set in environment variables!');
          console.error('Please check your .env file or environment configuration.');
        } else {
          console.error('\n⚠️  Database connection string:', 
            process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':****@')); // Hide password
        }
        
        console.error('\n💡 Troubleshooting tips:');
        console.error('1. Ensure your database server is running');
        console.error('2. Check your DATABASE_URL connection string');
        console.error('3. Verify network connectivity to the database');
        console.error('4. Check database server logs for connection issues');
        
        throw error;
      }
      
      if (isConnectionError) {
        const delay = retryDelay * Math.pow(2, retries - 1); // Exponential backoff
        console.warn(`⚠️  Connection failed (${error.code || error.name}). Retrying in ${delay}ms...`);
        await sleep(delay);
      } else {
        // Non-retryable error
        console.error('❌ Non-retryable database error:', error);
        throw error;
      }
    }
  }
}

// Graceful shutdown
async function disconnectPrisma() {
  try {
    await prisma.$disconnect();
    console.log('✅ Prisma Client disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting Prisma Client:', error);
  }
}

// Handle process termination
process.on('beforeExit', async () => {
  await disconnectPrisma();
});

process.on('SIGINT', async () => {
  await disconnectPrisma();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectPrisma();
  process.exit(0);
});

module.exports = {
  prisma,
  connectPrisma,
  disconnectPrisma,
};

