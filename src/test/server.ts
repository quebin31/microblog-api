import { Server } from 'http';
import { clearDatabase } from './prisma';
import redisClient from '../redis';
import { startServer } from '../server';

export async function startTestServer() {
  const server = await startServer();
  await clearDatabase();
  await redisClient.flushDb();
  return server;
}

export async function closeTestServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => err !== undefined ? reject(err) : resolve());
  });
}
