import { clearDatabase } from '../../test/prisma';
import { accountsRepository } from '../accounts.repository';
import { createSignUpData } from '../../test/factories/accounts';
import { captor } from 'jest-mock-extended';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'crypto';

beforeEach(async () => {
  await clearDatabase();
});

describe('Create new user', () => {
  test('returns newly created user', async () => {
    const data = createSignUpData();
    const user = await accountsRepository.createNewUser(data);

    expect(user).toMatchObject(data);
  });

  test('fails if email is not unique', async () => {
    const data = createSignUpData();
    await accountsRepository.createNewUser(data);

    const error = captor<PrismaClientKnownRequestError>();
    await expect(accountsRepository.createNewUser(data)).rejects.toEqual(error);
    expect(error.value.code).toEqual('P2002');
  });
});

describe('Find a user', () => {
  test('returns null if no user is found by email', async () => {
    const email = faker.internet.email();
    await expect(accountsRepository.findByEmail(email)).resolves.toBeNull();
  });

  test('returns null if no user is found by id', async () => {
    const userId = randomUUID();
    await expect(accountsRepository.findById(userId)).resolves.toBeNull();
  });

  test('returns found user by email', async () => {
    const data = createSignUpData();
    const user = await accountsRepository.createNewUser(data);

    await expect(accountsRepository.findByEmail(user.email)).resolves.toStrictEqual(user);
  });

  test('returns found user by id', async () => {
    const data = createSignUpData();
    const user = await accountsRepository.createNewUser(data);

    await expect(accountsRepository.findById(user.id)).resolves.toStrictEqual(user);
  });
});

describe('Verify a user', () => {
  test('fails if no user exists with the given id', async () => {
    const error = captor<PrismaClientKnownRequestError>();
    await expect(accountsRepository.verifyUser(randomUUID())).rejects.toEqual(error);
    expect(error.value.code).toEqual('P2025');
    expect(error.value.meta?.cause).toMatchInlineSnapshot(`"Record to update not found."`);
  });

  test('updates verified state of existent user', async () => {
    const data = createSignUpData();
    const user = await accountsRepository.createNewUser(data);
    expect(user.verified).toEqual(false);

    const updated = await accountsRepository.verifyUser(user.id);
    expect(updated).toStrictEqual({ ...user, verified: true });
  });
});

describe('Update a user', () => {
  test('fails if no user exists with the given id', async () => {
    const error = captor<PrismaClientKnownRequestError>();
    await expect(accountsRepository.updateUser(randomUUID(), {})).rejects.toEqual(error);
    expect(error.value.code).toEqual('P2025');
    expect(error.value.meta?.cause).toMatchInlineSnapshot(`"Record to update not found."`);
  });

  test('updates user data of existent user', async () => {
    const data = createSignUpData();
    const user = await accountsRepository.createNewUser(data);
    const newData = { name: 'New name' };

    const updated = await accountsRepository.updateUser(user.id, newData);
    expect(updated).toStrictEqual({ ...user, ...newData });
  });
});
