import redisClient from '../redis';

export async function clearRedis() {
  const isOpen = redisClient.isOpen;
  if (!isOpen) await redisClient.connect();
  await redisClient.flushDb();
  if (!isOpen) await redisClient.disconnect();
}
