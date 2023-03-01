import { SignInData, SignUpData } from '../schemas/accounts';
import { prisma } from '../prisma';
import { checkPassword, createJwt, isValidPassword, saltPassword } from '../utils/auth';
import config from '../config';
import { Role } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../errors';

export type AuthResponse = { id: string, accessToken: string };

export async function signUp(data: SignUpData): Promise<AuthResponse> {
  if (!isValidPassword(data.password)) {
    throw new BadRequestError('Password is not strong enough');
  }

  const saltedPassword = await saltPassword(data.password);
  const user = await prisma.user
    .create({
      data: { ...data, password: saltedPassword },
    })
    .catch((_) => {
      throw new BadRequestError('Email already registered');
    });

  const accessToken = createJwt({ sub: user.id, role: Role.user }, config.jwtSecret);
  return { id: user.id, accessToken };
}

export async function signIn(data: SignInData): Promise<AuthResponse> {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new NotFoundError('Invalid email or password');
  }

  const isSamePassword = await checkPassword(data.password, user.password);
  if (!isSamePassword) {
    throw new NotFoundError('Invalid email or password');
  }

  const accessToken = createJwt({ sub: user.id, role: user.role }, config.jwtSecret);
  return { id: user.id, accessToken };
}
