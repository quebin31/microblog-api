import { customAlphabet } from 'nanoid/async';
import { nolookalikes } from 'nanoid-dictionary';
import { BadRequestError, NotFoundError, TooManyRequestsError } from '../errors';
import { VerificationData } from '../schemas/accounts';
import { verificationRepository } from '../repositories/verification.repository';
import { accountsRepository } from '../repositories/accounts.repository';
import { emailService } from './email.service';


const codeGenerator = customAlphabet(nolookalikes, 6);

export type VerificationInput = { id: string, email?: string }

export const verificationService = {
  async isVerified(id: string): Promise<boolean> {
    const isVerified = await verificationRepository.isVerified.get(id);
    if (isVerified !== null) {
      return isVerified;
    }

    const user = await accountsRepository.findById(id);
    if (!user) {
      throw new NotFoundError(`Couldn't find user to check verification`);
    }

    await verificationRepository.isVerified.set(id, user.verified);
    return user.verified;
  },

  async sendVerificationEmail(input: VerificationInput) {
    const { id, email: maybeEmail } = input;

    if (await this.isVerified(id)) {
      throw new BadRequestError('User has already been verified');
    }

    let email;
    if (maybeEmail !== undefined) {
      email = maybeEmail;
    } else {
      const user = await accountsRepository.findById(id);
      if (!user) {
        throw new NotFoundError(`Couldn't find user to send email`);
      }

      email = user.email;
    }

    const requestedAt = await verificationRepository.requestedAt.get(id);
    if (requestedAt !== null && requestedAt + 60 * 1000 > Date.now()) {
      throw new TooManyRequestsError('Email verifications can only be sent every 60 seconds');
    }

    const verificationCode = await codeGenerator();
    await verificationRepository.requestedAt.set(id, Date.now());
    await verificationRepository.code.set(id, verificationCode);
    await emailService.sendVerificationCode(email, verificationCode);
  },

  async verifyEmail(id: string, data: VerificationData) {
    const savedCode = await verificationRepository.code.get(id);
    if (savedCode === null) {
      throw new NotFoundError(`Couldn't find an active verification code`);
    }

    if (data.verificationCode !== savedCode) {
      throw new BadRequestError('Received invalid verification code');
    }

    const updated = await accountsRepository.verifyUser(id)
      .catch((_) => {
        throw new NotFoundError(`Couldn't find user to verify`);
      });

    await verificationRepository.code.del(id);
    await verificationRepository.isVerified.set(id, updated.verified);
  },
};
