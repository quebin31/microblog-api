import { prismaMock } from '../../test/mocks/prisma';
import * as verificationService from '../verification.service';
import { randomUUID } from 'crypto';
import { BadRequestError, NotFoundError, TooManyRequestsError } from '../../errors';
import { createUser } from '../../test/factories/accounts';
import { redisClientMock } from '../../test/mocks/redis';
import { sendGridMailMock } from '../../test/mocks/sendgrid';
import { MailDataRequired } from '@sendgrid/mail';
import { nolookalikes } from 'nanoid-dictionary';
import { VerificationData } from '../../schemas/accounts';
import { verificationCache } from '../verification.service';

describe('Send email verification', function() {
  test('fails if no user exists with given id', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    await expect(verificationService.sendVerificationEmail({ id: randomUUID() })).rejects.toEqual(
      new NotFoundError(`Couldn't find user to send email`),
    );
  });

  const verifiedCacheCases = [[false], [true]];
  test.each(verifiedCacheCases)(
    'fails if user has already been verified (with cache: %p)',
    async (withCache) => {
      const user = createUser({ verified: true });

      redisClientMock.get
        .calledWith(verificationCache.isVerifiedKey(user.id))
        .mockResolvedValueOnce(withCache ? 'true' : null);
      prismaMock.user.findUnique.mockResolvedValueOnce(user);

      await expect(verificationService.sendVerificationEmail({ id: user.id })).rejects.toEqual(
        new BadRequestError('User has already been verified'),
      );
    });

  test('fails if not enough time has passed since last sent', async () => {
    const user = createUser();
    redisClientMock.get
      .calledWith(verificationCache.isVerifiedKey(user.id))
      .mockResolvedValueOnce(null);
    redisClientMock.get
      .calledWith(verificationCache.requestedAtKey(user.id))
      .mockResolvedValueOnce(Date.now().toString());
    prismaMock.user.findUnique.mockResolvedValue(user);

    await expect(verificationService.sendVerificationEmail({ id: user.id })).rejects.toEqual(
      new TooManyRequestsError('Email verifications can only be sent every 60 seconds'),
    );
  });

  const successCases = [[false], [true]];
  test.each(successCases)(
    'sends email and updates cache keys on success (provided email: %p)',
    async (withEmail) => {
      const before = Date.now();
      const user = createUser();
      const input = { id: user.id, email: withEmail ? user.email : undefined };

      redisClientMock.get
        .calledWith(verificationCache.isVerifiedKey(user.id))
        .mockResolvedValueOnce(null);
      redisClientMock.get
        .calledWith(verificationCache.requestedAtKey(user.id))
        .mockResolvedValueOnce(null);
      prismaMock.user.findUnique.mockResolvedValue(user);

      await verificationService.sendVerificationEmail(input);

      const lastTimestamp = parseInt(redisClientMock.set.mock.calls[1][1] as string);
      expect(lastTimestamp).toBeLessThanOrEqual(Date.now());
      expect(lastTimestamp).toBeGreaterThanOrEqual(before);

      const verificationCode = redisClientMock.set.mock.calls[2][1] as string;
      const regex = new RegExp(`^[${nolookalikes}]{6}$`);
      expect(regex.test(verificationCode)).toBeTruthy();

      expect(sendGridMailMock.send).toHaveBeenCalledTimes(1);
      const emailData = sendGridMailMock.send.mock.calls[0][0] as MailDataRequired;
      expect(emailData).toMatchObject({
        from: 'kevindelcastillo@ravn.co',
        to: user.email,
        subject: 'Confirm your Microblog account',
      });

      expect(emailData.text).toEqual(`Confirmation code: ${verificationCode}`);
      expect(emailData.html).toEqual(`Confirmation code: <strong>${verificationCode}</strong>`);
    });
});

describe('Verify email', () => {
  test('fails if verification code is not present in cache', async () => {
    const user = createUser();
    const data: VerificationData = { verificationCode: 'ABC123' };

    redisClientMock.get
      .calledWith(verificationCache.codeKey(user.id))
      .mockResolvedValueOnce(null);

    await expect(verificationService.verifyEmail(user.id, data)).rejects.toEqual(
      new NotFoundError(`Couldn't find an active verification code`),
    );
  });

  test(`fails if verification codes don't match`, async () => {
    const user = createUser();
    const data: VerificationData = { verificationCode: 'ABC123' };

    redisClientMock.get.mockResolvedValueOnce('123ABC');

    await expect(verificationService.verifyEmail(user.id, data)).rejects.toEqual(
      new BadRequestError('Received invalid verification code'),
    );
  });

  test(`fails if user doesn't exist`, async () => {
    const user = createUser();
    const data: VerificationData = { verificationCode: 'ABC123' };

    prismaMock.user.update.mockRejectedValueOnce(new Error(''));
    redisClientMock.get
      .calledWith(verificationCache.codeKey(user.id))
      .mockResolvedValueOnce('ABC123');

    await expect(verificationService.verifyEmail(user.id, data)).rejects.toEqual(
      new NotFoundError(`Couldn't find user to verify`),
    );
  });

  test('updates user verified state if codes match', async () => {
    const user = createUser();
    const updated = createUser({ ...user, verified: true });
    const data: VerificationData = { verificationCode: 'ABC123' };

    prismaMock.user.update.mockResolvedValueOnce(updated);
    redisClientMock.get
      .calledWith(verificationCache.codeKey(user.id))
      .mockResolvedValueOnce('ABC123');

    await verificationService.verifyEmail(user.id, data);

    expect(prismaMock.user.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { verified: true },
    });

    expect(redisClientMock.del).toHaveBeenCalledTimes(1);
    expect(redisClientMock.del).toHaveBeenCalledWith(verificationCache.codeKey(user.id));
    expect(redisClientMock.set).toHaveBeenCalledTimes(1);
  });
});
