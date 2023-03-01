import { SignUpData } from '../schemas/accounts';
import { prisma } from '../prisma';
import { createJwt, isValidPassword, saltPassword } from '../utils/auth';
import config from '../config';
import { Role } from '@prisma/client';
import { BadRequestError } from '../errors';

export type AuthResponse = { id: string, accessToken: string };

export async function signUp(data: SignUpData): Promise<AuthResponse> {
  if (!isValidPassword(data.password)) {
    throw new BadRequestError('Password is not strong enough')
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
