import * as accountsService from '../accounts.service';
import { prismaMock } from '../../test/prisma';
import { createSignUpData, createUser } from '../../test/factories/accounts';
import jwt from 'jsonwebtoken';
import { BadRequestError } from '../../errors';

describe('Create new account', () => {
  test('returns access token on success', async () => {
    const data = createSignUpData();
    const user = createUser(data);
    prismaMock.user.create.mockResolvedValueOnce(user);

    const result = await accountsService.signUp(data);

    expect(result).toMatchObject({ id: user.id });
    const decoded = jwt.decode(result.accessToken);
    expect(decoded).toMatchObject({ sub: user.id, role: user.role });
  });

  test('fails if email is already registered', async () => {
    const data = createSignUpData();
    prismaMock.user.create.mockRejectedValueOnce(new Error());

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
});
