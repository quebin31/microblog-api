import logger from './logger';
import config from './config';
import * as redis from 'redis';

const redisClient = redis.createClient({ url: config.redisUrl });

/* istanbul ignore next */
redisClient.on('error', (err) => {
  logger.error(`Redis client error: ${err}`);
});

export default redisClient;
