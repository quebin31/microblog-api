import { verificationRepository } from '../verification.repository';
import { randomUUID } from 'crypto';
import redisClient from '../../redis';
import { faker } from '@faker-js/faker';
import { clearRedis } from '../../test/redis';

beforeAll(async () => {
  await redisClient.connect();
});

beforeEach(async () => {
  await clearRedis();
});

afterAll(async () => {
  await redisClient.disconnect();
});

describe('Key-value operations', () => {
  test('set and get for isVerified', async () => {
    const userId = randomUUID();

    await expect(verificationRepository.isVerified.get(userId)).resolves.toEqual(null);
    await verificationRepository.isVerified.set(userId, false);
    await expect(verificationRepository.isVerified.get(userId)).resolves.toEqual(false);
    await verificationRepository.isVerified.set(userId, true);
    await expect(verificationRepository.isVerified.get(userId)).resolves.toEqual(true);
  });

  test('set and get for requestedAt', async () => {
    const userId = randomUUID();
    const date = Date.now();

    await expect(verificationRepository.requestedAt.get(userId)).resolves.toEqual(null);
    await verificationRepository.requestedAt.set(userId, date);
    await expect(verificationRepository.requestedAt.get(userId)).resolves.toEqual(date);
  });

  test('set, get and del for code', async () => {
    const userId = randomUUID();
    const code = faker.datatype.string(6);

    await expect(verificationRepository.code.get(userId)).resolves.toEqual(null);
    await verificationRepository.code.set(userId, code);
    await expect(verificationRepository.code.get(userId)).resolves.toEqual(code);
    await verificationRepository.code.del(userId);
    await expect(verificationRepository.code.get(userId)).resolves.toEqual(null);
  });
});
