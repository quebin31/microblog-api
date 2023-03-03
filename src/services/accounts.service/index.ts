import { SignInData, SignUpData } from '../../schemas/accounts';
import { checkPassword, createJwt, isValidPassword, saltPassword } from '../../utils/auth';
import config from '../../config';
import { Role } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../../errors';
import { eventEmitter } from '../../events';
import { UserEmailVerificationEvent } from '../../events/verification';
import { VerificationInput } from '../verification.service';
import { accountsDb } from './database';

export type AuthResponse = { id: string, accessToken: string };

export const accountsService = {
  async signUp(data: SignUpData): Promise<AuthResponse> {
    if (!isValidPassword(data.password)) {
      throw new BadRequestError('Password is not strong enough');
    }

    const saltedPassword = await saltPassword(data.password);
    const user = await accountsDb
      .createNewUser({ ...data, password: saltedPassword })
      .catch((_) => {
        throw new BadRequestError('Email already registered');
      });

    const accessToken = createJwt({ sub: user.id, role: Role.user }, config.jwtSecret);

    const verificationInput: VerificationInput = { id: user.id, email: user.email };
    eventEmitter.emit(UserEmailVerificationEvent, verificationInput);
    return { id: user.id, accessToken };
  },

  async signIn(data: SignInData): Promise<AuthResponse> {
    const user = await accountsDb.findByEmail(data.email);
    if (!user) {
      throw new NotFoundError('Invalid email or password');
    }

    const isSamePassword = await checkPassword(data.password, user.password);
    if (!isSamePassword) {
      throw new NotFoundError('Invalid email or password');
    }

    const accessToken = createJwt({ sub: user.id, role: user.role }, config.jwtSecret);
    return { id: user.id, accessToken };
  },
};
