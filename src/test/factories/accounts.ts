import { Role, User } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { SignUpData } from '../../schemas/accounts';

export function createUser(partial?: Partial<User>): User {
  return {
    createdAt: new Date(),
    email: faker.internet.email(),
    id: faker.datatype.uuid(),
    name: faker.name.firstName(),
    password: faker.datatype.string(16),
    publicEmail: false,
    publicName: true,
    role: Role.user,
    ...partial,
  };
}

export function createSignUpData(partial?: Partial<SignUpData>): SignUpData {
  return {
    email: faker.internet.email(),
    password: 'pa$$word123',
    name: faker.name.firstName(),
    ...partial,
  };
}
