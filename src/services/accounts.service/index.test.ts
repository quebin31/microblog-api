import { accountsService } from './index';
import { createSignInData, createSignUpData, createUser } from '../../test/factories/accounts';
import jwt from 'jsonwebtoken';
import { BadRequestError, NotFoundError } from '../../errors';
import { saltPassword } from '../../utils/auth';
import { eventEmitter } from '../../events';
import { UserEmailVerificationEvent } from '../../events/verification';
import { VerificationInput } from '../verification.service';
import { accountsDb } from './database';

jest.mock('../../events');
jest.mock('./database');

const accountsDbMock = accountsDb as jest.Mocked<typeof accountsDb>;

describe('Create new account', () => {
  test('fails if email is already registered', async () => {
    const data = createSignUpData();
    accountsDbMock.createNewUser.mockRejectedValueOnce(new Error());

    await expect(accountsService.signUp(data)).rejects
      .toEqual(new BadRequestError('Email already registered'));
  });

  const invalidPasswords = [
    ['short'], ['1235678'], ['passw0rd'], ['1235!1123'],
  ];
  test.each(invalidPasswords)(`fails with invalid password %p`, async (password) => {
    const data = createSignUpData({ password });

    await expect(accountsService.signUp(data)).rejects
      .toEqual(new BadRequestError('Password is not strong enough'));
  });

  test('returns access token on success', async () => {
    const data = createSignUpData();
    const user = createUser(data);
    accountsDbMock.createNewUser.mockResolvedValueOnce(user);

    const result = await accountsService.signUp(data);

    expect(result).toMatchObject({ id: user.id });
    const decoded = jwt.decode(result.accessToken);
    expect(decoded).toMatchObject({ sub: user.id, role: user.role });
  });

  test('triggers email verification event on success', async () => {
    const data = createSignUpData();
    const user = createUser(data);
    accountsDbMock.createNewUser.mockResolvedValueOnce(user);

    await accountsService.signUp(data);

    expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
    const input: VerificationInput = { id: user.id, email: user.email };
    expect(eventEmitter.emit).toHaveBeenCalledWith(UserEmailVerificationEvent, input);
  });
});

describe('Login flow', () => {
  test(`fails if no account exists with the given email`, async () => {
    const data = createSignInData();
    accountsDbMock.findByEmail.mockResolvedValueOnce(null);

    await expect(accountsService.signIn(data)).rejects
      .toEqual(new NotFoundError('Invalid email or password'));
  });

  test(`fails if passwords doesn't match`, async () => {
    const user = createUser({ password: await saltPassword('pass1234!') });
    const data = createSignInData({ password: '!1234pass' });
    accountsDbMock.findByEmail.mockResolvedValueOnce(user);

    await expect(accountsService.signIn(data)).rejects
      .toEqual(new NotFoundError('Invalid email or password'));
  });

  test('returns access token on success', async () => {
    const user = createUser({ password: await saltPassword('pass1234!') });
    const data = createSignInData({ password: 'pass1234!' });
    accountsDbMock.findByEmail.mockResolvedValueOnce(user);

    const result = await accountsService.signIn(data);

    expect(result).toMatchObject({ id: user.id });
    const decoded = jwt.decode(result.accessToken);
    expect(decoded).toMatchObject({ sub: user.id, role: user.role });
  });
});
