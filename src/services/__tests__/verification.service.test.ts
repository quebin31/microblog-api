import { prismaMock } from '../../test/prisma';
import * as verificationService from '../verification.service';
import { randomUUID } from 'crypto';
import { NotFoundError, TooManyRequestsError } from '../../errors';
import { createUser } from '../../test/factories/accounts';
import { redisClientMock } from '../../test/redis';

describe('Email send verification', function() {
  test('fails if no user exists with given id', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    await expect(verificationService.sendVerificationEmail(randomUUID())).rejects
      .toEqual(new NotFoundError(`Couldn't find user to send email`));
  });

  test('fails if not enough time has passed since last sent', async () => {
    const user = createUser();
    prismaMock.user.findUnique.mockResolvedValueOnce(user);
    redisClientMock.get.mockResolvedValueOnce(Date.now().toString());

    await expect(verificationService.sendVerificationEmail(user.id)).rejects
      .toEqual(new TooManyRequestsError('Email verifications can only be sent every 60 seconds'));
  });

  test('sends email and updates redis keys on success', async () => {
    const before = Date.now();
    const user = createUser();
    prismaMock.user.findUnique.mockResolvedValueOnce(user);
    redisClientMock.get.mockResolvedValueOnce(null);

    await verificationService.sendVerificationEmail(user.id);

    const lastTimestamp = parseInt(redisClientMock.set.mock.calls[0][1] as string);
    expect(lastTimestamp).toBeLessThanOrEqual(Date.now());
    expect(lastTimestamp).toBeGreaterThanOrEqual(before);

    const code = redisClientMock.set.mock.calls[1][1];
    expect(code).toHaveLength(6);
  });
});
