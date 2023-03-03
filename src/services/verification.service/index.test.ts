import { verificationService } from './index';
import { randomUUID } from 'crypto';
import { BadRequestError, NotFoundError, TooManyRequestsError } from '../../errors';
import { createUser } from '../../test/factories/accounts';
import { sendGridMailMock } from '../../test/mocks/sendgrid';
import { MailDataRequired } from '@sendgrid/mail';
import { nolookalikes } from 'nanoid-dictionary';
import { VerificationData } from '../../schemas/accounts';
import { accountsDb } from '../accounts.service/database';
import { verificationCache } from './cache';
import { DeepMockProxy, MockProxy, mockReset } from 'jest-mock-extended';

jest.mock('../accounts.service/database');
jest.mock('./cache');

const accountsDbMock = accountsDb as MockProxy<typeof accountsDb>;
const verificationCacheMock = verificationCache as DeepMockProxy<typeof verificationCache>;

beforeEach(() => {
  mockReset(accountsDbMock);
  mockReset(verificationCacheMock);
});

describe('Send email verification', function() {
  test('fails if no user exists with given id', async () => {
    accountsDbMock.findById.mockResolvedValue(null);

    await expect(verificationService.sendVerificationEmail({ id: randomUUID() })).rejects.toEqual(
      new NotFoundError(`Couldn't find user to send email`),
    );
  });

  const verifiedCacheCases = [[false], [true]];
  test.each(verifiedCacheCases)(
    'fails if user has already been verified (with cache: %p)',
    async (withCache) => {
      const user = createUser({ verified: true });

      accountsDbMock.findById.mockResolvedValue(user);
      verificationCacheMock.isVerified.get.mockResolvedValue(withCache ? 'true' : null);

      await expect(verificationService.sendVerificationEmail({ id: user.id })).rejects
        .toEqual(new BadRequestError('User has already been verified'));
    });

  test('fails if not enough time has passed since last sent', async () => {
    const user = createUser();

    accountsDbMock.findById.mockResolvedValue(user);
    verificationCacheMock.requestedAt.get.mockResolvedValue(Date.now().toString());
    verificationCacheMock.isVerified.get.mockResolvedValue(null);

    await expect(verificationService.sendVerificationEmail({ id: user.id })).rejects
      .toEqual(new TooManyRequestsError('Email verifications can only be sent every 60 seconds'));
  });

  const successCases = [[false], [true]];
  test.each(successCases)(
    'sends email and updates cache keys on success (provided email: %p)',
    async (withEmail) => {
      const before = Date.now();
      const user = createUser();
      const input = { id: user.id, email: withEmail ? user.email : undefined };

      accountsDbMock.findById.mockResolvedValue(user);
      verificationCacheMock.requestedAt.get.mockResolvedValue(null);
      verificationCacheMock.isVerified.get.mockResolvedValue(null);

      await verificationService.sendVerificationEmail(input);

      const requestedAt = verificationCacheMock.requestedAt.set.mock.calls[0][1];
      expect(requestedAt).toBeLessThanOrEqual(Date.now());
      expect(requestedAt).toBeGreaterThanOrEqual(before);

      const verificationCode = verificationCacheMock.code.set.mock.calls[0][1];
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

    verificationCacheMock.code.get.mockResolvedValue(null);

    await expect(verificationService.verifyEmail(user.id, data)).rejects.toEqual(
      new NotFoundError(`Couldn't find an active verification code`),
    );
  });

  test(`fails if verification codes don't match`, async () => {
    const user = createUser();
    const data: VerificationData = { verificationCode: 'ABC123' };

    verificationCacheMock.code.get.mockResolvedValue('123ABC');

    await expect(verificationService.verifyEmail(user.id, data)).rejects.toEqual(
      new BadRequestError('Received invalid verification code'),
    );
  });

  test(`fails if user doesn't exist`, async () => {
    const user = createUser();
    const data: VerificationData = { verificationCode: 'ABC123' };

    accountsDbMock.verifyUser.mockRejectedValueOnce(new Error(''));
    verificationCacheMock.code.get.mockResolvedValue('ABC123');

    await expect(verificationService.verifyEmail(user.id, data)).rejects.toEqual(
      new NotFoundError(`Couldn't find user to verify`),
    );
  });

  test('updates user verified state if codes match', async () => {
    const user = createUser();
    const updated = createUser({ ...user, verified: true });
    const data: VerificationData = { verificationCode: 'ABC123' };

    accountsDbMock.verifyUser.mockResolvedValue(updated);
    verificationCacheMock.code.get.mockResolvedValue('ABC123');

    await verificationService.verifyEmail(user.id, data);

    expect(accountsDbMock.verifyUser).toHaveBeenCalledTimes(1);
    expect(accountsDbMock.verifyUser).toHaveBeenCalledWith(user.id);

    expect(verificationCacheMock.code.del).toHaveBeenCalledTimes(1);
    expect(verificationCacheMock.code.del).toHaveBeenCalledWith(user.id);
    expect(verificationCacheMock.isVerified.set).toHaveBeenCalledTimes(1);
    expect(verificationCacheMock.isVerified.set).toHaveBeenCalledWith(user.id, true);
  });
});
