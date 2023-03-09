import * as auth from '../auth';
import { faker } from '@faker-js/faker';
import { Role } from '@prisma/client';
import { isValidPassword } from '../auth';

describe('Password Salting', () => {
  test('salted password is valid compared to original password', async () => {
    const password = faker.random.alphaNumeric(16);
    const saltedPassword = await auth.saltPassword(password);

    await expect(auth.checkPassword(password, saltedPassword)).resolves.toBeTruthy();
  });

  test('salted password is invalid compared to other password', async () => {
    const originalPassword = faker.random.alphaNumeric(14);
    const otherPassword = faker.random.alphaNumeric(10);
    const saltedPassword = await auth.saltPassword(originalPassword);

    await expect(auth.checkPassword(otherPassword, saltedPassword)).resolves.toBeFalsy();
  });
});


describe('JSON Web Token', () => {
  test('payload is valid if signed JWT is valid', () => {
    const secret = 'secret';
    const jwt = auth.createJwt({ sub: 'subject', role: Role.user }, secret);
    const jwtPayload = auth.verifyJwt(jwt, secret);

    expect(jwtPayload).toMatchObject({ sub: 'subject', role: Role.user });
  });

  test('payload is invalid if signed with different secret', () => {
    const secret = 'secret';
    const jwt = auth.createJwt({ sub: 'subject', role: Role.admin }, 'other-secret');

    expect(() => auth.verifyJwt(jwt, secret)).toThrow();
  });

  const invalidPayloads = [
    [{} as auth.AuthPayload],
    [{ role: Role.admin } as auth.AuthPayload],
    [{ sub: 'subject' } as auth.AuthPayload],
  ];
  test.each(invalidPayloads)('partial payload %p is invalid', (payload) => {
    const secret = 'secret';
    const jwt = auth.createJwt(payload, secret);

    expect(() => auth.verifyJwt(jwt, secret))
      .toThrowError('Received invalid JWT payload');
  });
});

describe('Password validation', () => {
  const validPasswords = [
    ['pa$$word123'],
    ['abc!1def'],
    ['hello1m1okay!'],
    ['Pass!1235'],
  ];
  test.each(validPasswords)('returns true with valid password %p', (password) => {
    expect(isValidPassword(password)).toEqual(true);
  });

  const invalidPasswords = [
    ['short'],
    ['no!numbers'],
    ['nosymb0ls'],
    ['12345511'],
    [`s1#${faker.random.alphaNumeric(30)}`],
  ];
  test.each(invalidPasswords)('returns false with invalid password %p', (password) => {
    expect(isValidPassword(password)).toEqual(false);
  });
});
