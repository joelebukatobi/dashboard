import Fastify from 'fastify';
import app from './app.js';

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' 
      ? { target: 'pino-pretty', options: { colorize: true } } 
      : undefined
  }
});

// Register application
await server.register(app);

// Get port and host from environment
const port = parseInt(process.env.PORT) || 7000;
const host = process.env.HOST || '0.0.0.0';

try {
  await server.listen({ port, host });
  server.log.info(`🚀 Server running at http://${host}:${port}`);
  server.log.info(`📊 Health check: http://${host}:${port}/health`);
  server.log.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Create restart signal file for Node.js Selector (production)
  if (process.env.NODE_ENV === 'production') {
    const fs = await import('fs');
    const path = await import('path');
    const restartFile = path.join(process.cwd(), 'tmp', 'restart.txt');
    
    // Ensure tmp directory exists
    if (!fs.existsSync(path.dirname(restartFile))) {
      fs.mkdirSync(path.dirname(restartFile), { recursive: true });
    }
    
    // Watch for restart signal
    fs.watchFile(restartFile, () => {
      server.log.info('Restart signal received, shutting down gracefully...');
      server.close();
      process.exit(0);
    });
  }
} catch (err) {
  server.log.error(err);
  process.exit(1);
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  server.log.info('SIGTERM received, closing server...');
  await server.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  server.log.info('SIGINT received, closing server...');
  await server.close();
  process.exit(0);
});
