import { accountsService } from '../accounts.service';
import { createSignInData, createSignUpData, createUser } from '../../test/factories/accounts';
import jwt from 'jsonwebtoken';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../errors';
import { saltPassword } from '../../utils/auth';
import { eventEmitter } from '../../events';
import { UserEmailVerificationEvent } from '../../events/verification';
import { VerificationInput } from '../verification.service';
import { accountsDao } from '../../dao/accounts.dao';
import { randomUUID } from 'crypto';
import { PatchAccountData } from '../../schemas/accounts';
import { Role } from '@prisma/client';
import { MockProxy, mockReset } from 'jest-mock-extended';

jest.mock('../../events');
jest.mock('../../dao/accounts.dao');

const accountsDaoMock = accountsDao as MockProxy<typeof accountsDao>;

beforeEach(() => {
  mockReset(accountsDaoMock);
});

describe('Create new account', () => {
  test('fails if email is already registered', async () => {
    const data = createSignUpData();
    accountsDaoMock.createNewUser.mockRejectedValueOnce(new Error());

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
    accountsDaoMock.createNewUser.mockResolvedValueOnce(user);

    const result = await accountsService.signUp(data);

    expect(result).toMatchObject({ id: user.id });
    const decoded = jwt.decode(result.accessToken);
    expect(decoded).toMatchObject({ sub: user.id, role: user.role });
  });

  test('triggers email verification event on success', async () => {
    const data = createSignUpData();
    const user = createUser(data);
    accountsDaoMock.createNewUser.mockResolvedValueOnce(user);

    await accountsService.signUp(data);

    expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
    const input: VerificationInput = { id: user.id, email: user.email };
    expect(eventEmitter.emit).toHaveBeenCalledWith(UserEmailVerificationEvent, input);
  });
});

describe('Login flow', () => {
  test(`fails if no account exists with the given email`, async () => {
    const data = createSignInData();
    accountsDaoMock.findByEmail.mockResolvedValueOnce(null);

    await expect(accountsService.signIn(data)).rejects
      .toEqual(new NotFoundError('Invalid email or password'));
  });

  test(`fails if passwords doesn't match`, async () => {
    const user = createUser({ password: await saltPassword('pass1234!') });
    const data = createSignInData({ password: '!1234pass' });
    accountsDaoMock.findByEmail.mockResolvedValueOnce(user);

    await expect(accountsService.signIn(data)).rejects
      .toEqual(new NotFoundError('Invalid email or password'));
  });

  test('returns access token on success', async () => {
    const user = createUser({ password: await saltPassword('pass1234!') });
    const data = createSignInData({ password: 'pass1234!' });
    accountsDaoMock.findByEmail.mockResolvedValueOnce(user);

    const result = await accountsService.signIn(data);

    expect(result).toMatchObject({ id: user.id });
    const decoded = jwt.decode(result.accessToken);
    expect(decoded).toMatchObject({ sub: user.id, role: user.role });
  });
});

describe('Get account', () => {
  test(`fails if user doesn't exists`, async () => {
    accountsDaoMock.findById.mockResolvedValue(null);

    const uuid = randomUUID();
    await expect(accountsService.getAccount(uuid)).rejects
      .toEqual(new NotFoundError(`Couldn't find user with id ${uuid}`));
  });

  test(`fails if user isn't verified`, async () => {
    const user = createUser({ verified: false });
    accountsDaoMock.findById.mockResolvedValue(user);

    await expect(accountsService.getAccount(user.id)).rejects
      .toEqual(new NotFoundError(`Couldn't find user with id ${user.id}`));
  });

  test('returns account if user is found and it is verified', async () => {
    const user = createUser({ verified: true, publicEmail: true, publicName: true });
    accountsDaoMock.findById.mockResolvedValue(user);

    const expected = { email: user.email, name: user.name, role: user.role };
    await expect(accountsService.getAccount(user.id)).resolves.toEqual(expected);
  });

  test(`returns account with email as null if it's not public`, async () => {
    const user = createUser({ verified: true, publicEmail: false, publicName: true });
    accountsDaoMock.findById.mockResolvedValue(user);

    const expected = { email: null, name: user.name, role: user.role };
    await expect(accountsService.getAccount(user.id)).resolves.toEqual(expected);
  });

  test(`returns account with name as null if it's not public`, async () => {
    const user = createUser({ verified: true, publicEmail: true, publicName: false });
    accountsDaoMock.findById.mockResolvedValue(user);

    const expected = { email: user.email, name: null, role: user.role };
    await expect(accountsService.getAccount(user.id)).resolves.toEqual(expected);
  });

  const verifiedCases = [[false], [true]];
  test.each(verifiedCases)(
    'returns all account info if user is the owner (verified: %p)',
    async (verified) => {
      const user = createUser({ verified, publicEmail: false, publicName: false });
      accountsDaoMock.findById.mockResolvedValue(user);

      const expected = { email: user.email, name: user.name, role: user.role };
      await expect(accountsService.getAccount(user.id, user.id)).resolves.toEqual(expected);
    });
});

describe('Update account', () => {
  test(`fails to update personal info if user doesn't exist`, async () => {
    accountsDaoMock.updateUser.mockRejectedValue(new Error());

    const uuid = randomUUID();
    await expect(accountsService.updateAccount(uuid, uuid, {})).rejects
      .toEqual(new NotFoundError(`Couldn't find user with id ${uuid}`));
  });

  const updateCases: PatchAccountData[][] = [
    [{ name: 'New name' }],
    [{ publicEmail: true }],
    [{ publicName: true }],
  ];

  test.each(updateCases)(`fails to update personal info if it's not the owner (%p)`, async (data) => {
    const user = createUser({ name: 'Old', publicName: false, publicEmail: false });
    accountsDaoMock.findById.mockResolvedValue(user);

    const otherUuid = randomUUID();
    await expect(accountsService.updateAccount(user.id, otherUuid, data)).rejects
      .toEqual(new ForbiddenError('Cannot update account'));
  });

  test.each([[Role.user], [Role.moderator]])(
    `fails to change role if caller's role is %p`,
    async (otherRole) => {
      const caller = createUser({ role: otherRole });
      const user = createUser({ role: Role.user });

      accountsDaoMock.findById.calledWith(caller.id).mockResolvedValue(caller);
      accountsDaoMock.findById.calledWith(user.id).mockResolvedValue(user);

      await expect(accountsService.updateAccount(user.id, caller.id, { role: Role.moderator }))
        .rejects
        .toEqual(new ForbiddenError('Only admins can change roles'));
    });

  test(`fails to change role if user doesn't exist`, async () => {
    const caller = createUser({ role: Role.admin });
    const userId = randomUUID();

    accountsDaoMock.findById.calledWith(caller.id).mockResolvedValue(caller);
    accountsDaoMock.updateUser.mockRejectedValue(new Error());

    await expect(accountsService.updateAccount(userId, caller.id, { role: Role.moderator }))
      .rejects
      .toEqual(new NotFoundError(`Couldn't find user with id ${userId}`));
  });

  const roleUserCases = [
    [createUser({ role: Role.user, publicName: true, publicEmail: false })],
    [createUser({ role: Role.user, publicName: false, publicEmail: true })],
  ];
  test.each(roleUserCases)('succeeds to change role if caller is an admin', async (user) => {
    const caller = createUser({ role: Role.admin });

    accountsDaoMock.findById.calledWith(caller.id).mockResolvedValue(caller);
    accountsDaoMock.updateUser.mockResolvedValue({ ...user, role: Role.moderator });

    await expect(accountsService.updateAccount(user.id, caller.id, { role: Role.moderator }))
      .resolves
      .toStrictEqual({
        role: Role.moderator,
        email: user.publicEmail ? user.email : null,
        name: user.publicName ? user.name : null,
      });
  });

  test.each(updateCases)(
    'succeeds to update data if caller is the owner (%p)',
    async (data) => {
      const user = createUser({ name: 'Old', publicName: false, publicEmail: false });
      accountsDaoMock.findById.mockResolvedValue(user);
      accountsDaoMock.updateUser.mockResolvedValue({ ...user, ...data });

      const castedData = data as { name?: string, publicEmail?: boolean, publicName?: boolean };

      await expect(accountsService.updateAccount(user.id, user.id, data))
        .resolves
        .toStrictEqual({
          role: user.role,
          email: user.email,
          name: castedData?.name ?? user.name,
        });
    });
});

describe('Check if user is moderator or admin', () => {
  test('non existent user returns false', async () => {
    accountsDaoMock.findById.mockResolvedValue(null);

    await expect(accountsService.isModeratorOrAdmin(randomUUID())).resolves.toEqual(false);
  });

  test(`user with "user" role returns false`, async () => {
    const user = createUser({ role: Role.user });
    accountsDaoMock.findById.mockResolvedValue(user);

    await expect(accountsService.isModeratorOrAdmin(user.id)).resolves.toEqual(false);
  });

  const roleCases: Role[][] = [[Role.moderator], [Role.admin]];
  test.each(roleCases)('user with %p role returns true', async (role: Role) => {
    const user = createUser({ role });
    accountsDaoMock.findById.mockResolvedValue(user);

    await expect(accountsService.isModeratorOrAdmin(user.id)).resolves.toEqual(true);
  });
});
