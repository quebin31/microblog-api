import express from 'express';
import { errorHandler } from './middlewares/error';
import { customMorganMiddleware } from './middlewares/log';
import router from './router';
import config from './config';
import logger from './logger';
import redisClient from './redis';
import { registerEventHandlers } from './events';
import { Server } from 'http';

const server = express();

server.use(customMorganMiddleware);
server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use('/api/v1', router);
server.use(errorHandler({ stack: config.nodeEnv === 'development' }));

export async function startServer(port: number = parseInt(config.port)): Promise<Server> {
  logger.info('Connecting to Redis...');
  await redisClient.connect();
  logger.info('Successfully connected to Redis!');
  registerEventHandlers();
  logger.info('Collecting events...');

  return new Promise((resolve, reject) => {
    const httpServer = server.listen(port);

    httpServer.once('error', reject);
    httpServer.once('listening', () => {
      logger.info(`Listening on http://localhost:${port}`);
      resolve(httpServer);
    });
  });
}

export async function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => err !== undefined ? reject(err) : resolve());
  })
}
