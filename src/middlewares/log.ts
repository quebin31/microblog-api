import morgan from 'morgan';
import logger from '../logger';

export const customMorganMiddleware = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  { stream: { write: (str) => logger.http(str.trim()) } },
);
