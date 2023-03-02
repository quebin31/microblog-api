import server from './server';
import config from './config';
import logger from './logger';
import redisClient from './redis';

async function main() {
  logger.info('Connecting to Redis...');
  await redisClient.connect();
  logger.info('Successfully connected to Redis!');

  server.listen(parseInt(config.port), () => {
    logger.info(`Listening on http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  logger.error(`Failed to initialize server: ${err}`);
});
