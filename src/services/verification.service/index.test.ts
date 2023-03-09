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
import { captor, DeepMockProxy, MockProxy, mockReset } from 'jest-mock-extended';

jest.mock('../accounts.service/database');
jest.mock('./cache');

const accountsDbMock = accountsDb as MockProxy<typeof accountsDb>;
const verificationCacheMock = verificationCache as DeepMockProxy<typeof verificationCache>;

beforeEach(() => {
  mockReset(accountsDbMock);
  mockReset(verificationCacheMock);
});

describe('Check if user is verified', () => {
  const verifiedValues = [[false], [true]];

  test.each(verifiedValues)('returns value %p from cache (if available)', async (cached) => {
    verificationCacheMock.isVerified.get.mockResolvedValue(cached);

    await expect(verificationService.isVerified(randomUUID())).resolves.toEqual(cached);
  });

  test(`fails if there isn't cache and user doesn't exist`, async () => {
    verificationCacheMock.isVerified.get.mockResolvedValue(null);
    accountsDbMock.findById.mockResolvedValue(null);

    await expect(verificationService.isVerified(randomUUID())).rejects
      .toEqual(new NotFoundError(`Couldn't find user to check verification`));
  });

  test.each(verifiedValues)(`returns user verified value %p and caches value`, async (verified) => {
    const user = createUser({ verified });
    verificationCacheMock.isVerified.get.mockResolvedValue(null);
    accountsDbMock.findById.mockResolvedValue(user);

    await expect(verificationService.isVerified(user.id)).resolves.toEqual(verified);

    expect(verificationCacheMock.isVerified.set).toHaveBeenCalledWith(user.id, verified);
  });
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
      verificationCacheMock.isVerified.get.mockResolvedValue(withCache ? true : null);

      await expect(verificationService.sendVerificationEmail({ id: user.id })).rejects
        .toEqual(new BadRequestError('User has already been verified'));
    });

  test('fails if not enough time has passed since last sent', async () => {
    const user = createUser();

    accountsDbMock.findById.mockResolvedValue(user);
    verificationCacheMock.requestedAt.get.mockResolvedValue(Date.now());
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

      const requestedAtCaptor = captor<number>();
      expect(verificationCacheMock.requestedAt.set).toHaveBeenCalledWith(user.id, requestedAtCaptor);
      expect(requestedAtCaptor.value).toBeLessThanOrEqual(Date.now());
      expect(requestedAtCaptor.value).toBeGreaterThanOrEqual(before);

      const verificationCodeCaptor = captor<string>();
      expect(verificationCacheMock.code.set).toHaveBeenCalledWith(user.id, verificationCodeCaptor);
      const regex = new RegExp(`^[${nolookalikes}]{6}$`);
      const verificationCode = verificationCodeCaptor.value;
      expect(regex.test(verificationCodeCaptor.value)).toBeTruthy();

      expect(sendGridMailMock.send).toHaveBeenCalledTimes(1);
      const emailDataCaptor = captor<MailDataRequired>();
      expect(sendGridMailMock.send).toHaveBeenCalledWith(emailDataCaptor);
      expect(emailDataCaptor.value).toMatchObject({
        from: 'kevindelcastillo@ravn.co',
        to: user.email,
        subject: 'Confirm your Microblog account',
      });

      const emailData = emailDataCaptor.value;
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
