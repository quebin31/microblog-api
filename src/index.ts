import server from './server';
import config from './config';
import logger from './logger';

server.listen(parseInt(config.port), () => {
  logger.info(`Listening on http://localhost:${config.port}`);
});
