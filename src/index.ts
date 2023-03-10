import config from './config';
import server from './server';
import logger from './logger';
import redisClient from './redis';
import { startCollectingEvents } from './events';

async function main() {
  logger.info('Connecting to Redis...');
  await redisClient.connect();
  logger.info('Successfully connected to Redis!');

  server.listen(parseInt(config.port), () => {
    startCollectingEvents();
    logger.info(`Listening on http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  logger.error(`Failed to initialize server: ${err}`);
});
