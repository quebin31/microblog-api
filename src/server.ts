import express from 'express';
import { errorHandler } from './middlewares/error';
import { customMorganMiddleware } from './middlewares/log';

const server = express();

server.use(customMorganMiddleware);
server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(errorHandler);

export default server;
