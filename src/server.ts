import express from 'express';
import { errorHandler } from './middlewares/error';
import { customMorganMiddleware } from './middlewares/log';
import router from './router';

const server = express();

server.use(customMorganMiddleware);
server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use('/api/v1', router);
server.use(errorHandler);

export default server;
