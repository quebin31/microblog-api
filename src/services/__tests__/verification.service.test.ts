import { verificationService } from '../verification.service';
import { randomUUID } from 'crypto';
import { BadRequestError, NotFoundError, TooManyRequestsError } from '../../errors';
import { createUser } from '../../test/factories/accounts';
import { sendGridMailMock } from '../../test/mocks/sendgrid';
import { MailDataRequired } from '@sendgrid/mail';
import { nolookalikes } from 'nanoid-dictionary';
import { VerificationData } from '../../schemas/accounts';
import { accountsRepository } from '../../repositories/accounts.repository';
import { verificationRepository } from '../../repositories/verification.repository';
import { captor, DeepMockProxy, MockProxy, mockReset } from 'jest-mock-extended';

jest.mock('../../repositories/accounts.repository');
jest.mock('../../repositories/verification.repository');

const accountsDaoMock = accountsRepository as MockProxy<typeof accountsRepository>;
const verificationDaoMock = verificationRepository as DeepMockProxy<typeof verificationRepository>;

beforeEach(() => {
  mockReset(accountsDaoMock);
  mockReset(verificationDaoMock);
});

describe('Check if user is verified', () => {
  const verifiedValues = [[false], [true]];

  test.each(verifiedValues)('returns value %p from cache (if available)', async (cached) => {
    verificationDaoMock.isVerified.get.mockResolvedValue(cached);

    await expect(verificationService.isVerified(randomUUID())).resolves.toEqual(cached);
  });

  test(`fails if there isn't cache and user doesn't exist`, async () => {
    verificationDaoMock.isVerified.get.mockResolvedValue(null);
    accountsDaoMock.findById.mockResolvedValue(null);

    await expect(verificationService.isVerified(randomUUID())).rejects
      .toEqual(new NotFoundError(`Couldn't find user to check verification`));
  });

  test.each(verifiedValues)(`returns user verified value %p and caches value`, async (verified) => {
    const user = createUser({ verified });
    verificationDaoMock.isVerified.get.mockResolvedValue(null);
    accountsDaoMock.findById.mockResolvedValue(user);

    await expect(verificationService.isVerified(user.id)).resolves.toEqual(verified);

    expect(verificationDaoMock.isVerified.set).toHaveBeenCalledWith(user.id, verified);
  });
});

describe('Send email verification', function() {
  test('fails if no user exists with given id', async () => {
    accountsDaoMock.findById.mockResolvedValue(null);

    await expect(verificationService.sendVerificationEmail({ id: randomUUID() })).rejects.toEqual(
      new NotFoundError(`Couldn't find user to send email`),
    );
  });

  const verifiedCacheCases = [[false], [true]];
  test.each(verifiedCacheCases)(
    'fails if user has already been verified (with cache: %p)',
    async (withCache) => {
      const user = createUser({ verified: true });

      accountsDaoMock.findById.mockResolvedValue(user);
      verificationDaoMock.isVerified.get.mockResolvedValue(withCache ? true : null);

      await expect(verificationService.sendVerificationEmail({ id: user.id })).rejects
        .toEqual(new BadRequestError('User has already been verified'));
    });

  test('fails if not enough time has passed since last sent', async () => {
    const user = createUser();

    accountsDaoMock.findById.mockResolvedValue(user);
    verificationDaoMock.requestedAt.get.mockResolvedValue(Date.now());
    verificationDaoMock.isVerified.get.mockResolvedValue(null);

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

      accountsDaoMock.findById.mockResolvedValue(user);
      verificationDaoMock.requestedAt.get.mockResolvedValue(null);
      verificationDaoMock.isVerified.get.mockResolvedValue(null);

      await verificationService.sendVerificationEmail(input);

      const requestedAtCaptor = captor<number>();
      expect(verificationDaoMock.requestedAt.set).toHaveBeenCalledWith(user.id, requestedAtCaptor);
      expect(requestedAtCaptor.value).toBeLessThanOrEqual(Date.now());
      expect(requestedAtCaptor.value).toBeGreaterThanOrEqual(before);

      const verificationCodeCaptor = captor<string>();
      expect(verificationDaoMock.code.set).toHaveBeenCalledWith(user.id, verificationCodeCaptor);
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

    verificationDaoMock.code.get.mockResolvedValue(null);

    await expect(verificationService.verifyEmail(user.id, data)).rejects.toEqual(
      new NotFoundError(`Couldn't find an active verification code`),
    );
  });

  test(`fails if verification codes don't match`, async () => {
    const user = createUser();
    const data: VerificationData = { verificationCode: 'ABC123' };

    verificationDaoMock.code.get.mockResolvedValue('123ABC');

    await expect(verificationService.verifyEmail(user.id, data)).rejects.toEqual(
      new BadRequestError('Received invalid verification code'),
    );
  });

  test(`fails if user doesn't exist`, async () => {
    const user = createUser();
    const data: VerificationData = { verificationCode: 'ABC123' };

    accountsDaoMock.verifyUser.mockRejectedValueOnce(new Error(''));
    verificationDaoMock.code.get.mockResolvedValue('ABC123');

    await expect(verificationService.verifyEmail(user.id, data)).rejects.toEqual(
      new NotFoundError(`Couldn't find user to verify`),
    );
  });

  test('updates user verified state if codes match', async () => {
    const user = createUser();
    const updated = createUser({ ...user, verified: true });
    const data: VerificationData = { verificationCode: 'ABC123' };

    accountsDaoMock.verifyUser.mockResolvedValue(updated);
    verificationDaoMock.code.get.mockResolvedValue('ABC123');

    await verificationService.verifyEmail(user.id, data);

    expect(accountsDaoMock.verifyUser).toHaveBeenCalledTimes(1);
    expect(accountsDaoMock.verifyUser).toHaveBeenCalledWith(user.id);

    expect(verificationDaoMock.code.del).toHaveBeenCalledTimes(1);
    expect(verificationDaoMock.code.del).toHaveBeenCalledWith(user.id);
    expect(verificationDaoMock.isVerified.set).toHaveBeenCalledTimes(1);
    expect(verificationDaoMock.isVerified.set).toHaveBeenCalledWith(user.id, true);
  });
});
