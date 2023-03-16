import logger from './logger';
import { startServer } from './server';

startServer()
  .catch((err) => logger.error(`Failed to initialize server: ${err}`));

