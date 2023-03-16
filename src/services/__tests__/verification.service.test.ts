import { verificationService } from '../verification.service';
import { emailService } from '../email.service';
import { randomUUID } from 'crypto';
import { BadRequestError, NotFoundError, TooManyRequestsError } from '../../errors';
import { createUser } from '../../test/factories/accounts';
import { nolookalikes } from 'nanoid-dictionary';
import { VerificationData } from '../../schemas/accounts';
import { accountsRepository } from '../../repositories/accounts.repository';
import { verificationRepository } from '../../repositories/verification.repository';
import { captor, DeepMockProxy, MockProxy, mockReset } from 'jest-mock-extended';

jest.mock('../../repositories/accounts.repository');
jest.mock('../../repositories/verification.repository');
jest.mock('../email.service');

const accountsRepositoryMock = accountsRepository as MockProxy<typeof accountsRepository>;
const verificationRepositoryMock = verificationRepository as DeepMockProxy<typeof verificationRepository>;
const emailServiceMock = emailService as MockProxy<typeof emailService>;

beforeEach(() => {
  mockReset(accountsRepositoryMock);
  mockReset(verificationRepositoryMock);
  mockReset(emailServiceMock);
});

describe('Check if user is verified', () => {
  const verifiedValues = [[false], [true]];

  test.each(verifiedValues)('returns value %p from cache (if available)', async (cached) => {
    verificationRepositoryMock.isVerified.get.mockResolvedValue(cached);

    await expect(verificationService.isVerified(randomUUID())).resolves.toEqual(cached);
  });

  test(`fails if there isn't cache and user doesn't exist`, async () => {
    verificationRepositoryMock.isVerified.get.mockResolvedValue(null);
    accountsRepositoryMock.findById.mockResolvedValue(null);

    await expect(verificationService.isVerified(randomUUID())).rejects
      .toEqual(new NotFoundError(`Couldn't find user to check verification`));
  });

  test.each(verifiedValues)(`returns user verified value %p and caches value`, async (verified) => {
    const user = createUser({ verified });
    verificationRepositoryMock.isVerified.get.mockResolvedValue(null);
    accountsRepositoryMock.findById.mockResolvedValue(user);

    await expect(verificationService.isVerified(user.id)).resolves.toEqual(verified);

    expect(verificationRepositoryMock.isVerified.set).toHaveBeenCalledWith(user.id, verified);
  });
});

describe('Send email verification', function() {
  test('fails if no user exists with given id', async () => {
    accountsRepositoryMock.findById.mockResolvedValue(null);

    await expect(verificationService.sendVerificationEmail({ id: randomUUID() })).rejects.toEqual(
      new NotFoundError(`Couldn't find user to send email`),
    );
  });

  const verifiedCacheCases = [[false], [true]];
  test.each(verifiedCacheCases)(
    'fails if user has already been verified (with cache: %p)',
    async (withCache) => {
      const user = createUser({ verified: true });

      accountsRepositoryMock.findById.mockResolvedValue(user);
      verificationRepositoryMock.isVerified.get.mockResolvedValue(withCache ? true : null);

      await expect(verificationService.sendVerificationEmail({ id: user.id })).rejects
        .toEqual(new BadRequestError('User has already been verified'));
    });

  test('fails if not enough time has passed since last sent', async () => {
    const user = createUser();

    accountsRepositoryMock.findById.mockResolvedValue(user);
    verificationRepositoryMock.requestedAt.get.mockResolvedValue(Date.now());
    verificationRepositoryMock.isVerified.get.mockResolvedValue(null);

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

      accountsRepositoryMock.findById.mockResolvedValue(user);
      verificationRepositoryMock.requestedAt.get.mockResolvedValue(null);
      verificationRepositoryMock.isVerified.get.mockResolvedValue(null);

      await verificationService.sendVerificationEmail(input);

      const requestedAtCaptor = captor<number>();
      expect(verificationRepositoryMock.requestedAt.set).toHaveBeenCalledWith(user.id, requestedAtCaptor);
      expect(requestedAtCaptor.value).toBeLessThanOrEqual(Date.now());
      expect(requestedAtCaptor.value).toBeGreaterThanOrEqual(before);

      const verificationCodeCaptor = captor<string>();
      expect(verificationRepositoryMock.code.set).toHaveBeenCalledWith(user.id, verificationCodeCaptor);
      const regex = new RegExp(`^[${nolookalikes}]{6}$`);
      const verificationCode = verificationCodeCaptor.value;
      expect(regex.test(verificationCodeCaptor.value)).toEqual(true);

      expect(emailServiceMock.sendVerificationCode).toHaveBeenCalledWith(user.email, verificationCode);
    });
});

describe('Verify email', () => {
  test('fails if verification code is not present in cache', async () => {
    const user = createUser();
    const data: VerificationData = { verificationCode: 'ABC123' };

    verificationRepositoryMock.code.get.mockResolvedValue(null);

    await expect(verificationService.verifyEmail(user.id, data)).rejects.toEqual(
      new NotFoundError(`Couldn't find an active verification code`),
    );
  });

  test(`fails if verification codes don't match`, async () => {
    const user = createUser();
    const data: VerificationData = { verificationCode: 'ABC123' };

    verificationRepositoryMock.code.get.mockResolvedValue('123ABC');

    await expect(verificationService.verifyEmail(user.id, data)).rejects.toEqual(
      new BadRequestError('Received invalid verification code'),
    );
  });

  test(`fails if user doesn't exist`, async () => {
    const user = createUser();
    const data: VerificationData = { verificationCode: 'ABC123' };

    accountsRepositoryMock.verifyUser.mockRejectedValueOnce(new Error(''));
    verificationRepositoryMock.code.get.mockResolvedValue('ABC123');

    await expect(verificationService.verifyEmail(user.id, data)).rejects.toEqual(
      new NotFoundError(`Couldn't find user to verify`),
    );
  });

  test('updates user verified state if codes match', async () => {
    const user = createUser();
    const updated = createUser({ ...user, verified: true });
    const data: VerificationData = { verificationCode: 'ABC123' };

    accountsRepositoryMock.verifyUser.mockResolvedValue(updated);
    verificationRepositoryMock.code.get.mockResolvedValue('ABC123');

    await verificationService.verifyEmail(user.id, data);

    expect(accountsRepositoryMock.verifyUser).toHaveBeenCalledTimes(1);
    expect(accountsRepositoryMock.verifyUser).toHaveBeenCalledWith(user.id);

    expect(verificationRepositoryMock.code.del).toHaveBeenCalledTimes(1);
    expect(verificationRepositoryMock.code.del).toHaveBeenCalledWith(user.id);
    expect(verificationRepositoryMock.isVerified.set).toHaveBeenCalledTimes(1);
    expect(verificationRepositoryMock.isVerified.set).toHaveBeenCalledWith(user.id, true);
  });
});
