import express from 'express';
import { errorHandler } from './middlewares/error';

const server = express();

server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(errorHandler);

export default server;
