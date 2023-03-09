import express from 'express';
import { errorHandler } from './middlewares/error';
import { customMorganMiddleware } from './middlewares/log';
import router from './router';
import config from './config';

const server = express();

server.use(customMorganMiddleware);
server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use('/api/v1', router);
server.use(errorHandler({ stack: config.nodeEnv !== 'production' }));

export default server;
