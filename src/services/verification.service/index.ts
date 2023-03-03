import sendGridMail from '@sendgrid/mail';
import config from '../../config';
import { customAlphabet } from 'nanoid/async';
import { nolookalikes } from 'nanoid-dictionary';
import { BadRequestError, NotFoundError, TooManyRequestsError } from '../../errors';
import { VerificationData } from '../../schemas/accounts';
import { verificationCache } from './cache';
import { accountsDb } from '../accounts.service/database';

sendGridMail.setApiKey(config.emailApiKey);

async function sendEmailWithCode(email: string, verificationCode: string) {
  return sendGridMail.send({
    to: email,
    from: 'kevindelcastillo@ravn.co',
    subject: 'Confirm your Microblog account',
    text: `Confirmation code: ${verificationCode}`,
    html: `Confirmation code: <strong>${verificationCode}</strong>`,
  });
}

const codeGenerator = customAlphabet(nolookalikes, 6);

export type VerificationInput = { id: string, email?: string }

export const verificationService = {
  async isVerified(id: string): Promise<boolean> {
    const isVerified = await verificationCache.isVerified.get(id);
    if (isVerified !== null) {
      return isVerified === 'true';
    }

    const user = await accountsDb.findById(id);
    if (user === null) {
      throw new NotFoundError(`Couldn't find user to check verification`);
    }

    await verificationCache.isVerified.set(id, user.verified);
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
      const user = await accountsDb.findById(id);
      if (!user) {
        throw new NotFoundError(`Couldn't find user to send email`);
      }

      email = user.email;
    }

    const requestedAt = await verificationCache.requestedAt.get(id);
    if (requestedAt !== null && parseInt(requestedAt) + 60 * 1000 > Date.now()) {
      throw new TooManyRequestsError('Email verifications can only be sent every 60 seconds');
    }

    const verificationCode = await codeGenerator();
    await verificationCache.requestedAt.set(id, Date.now());
    await verificationCache.code.set(id, verificationCode);
    await sendEmailWithCode(email, verificationCode);
  },

  async verifyEmail(id: string, data: VerificationData) {
    const savedCode = await verificationCache.code.get(id);
    if (savedCode === null) {
      throw new NotFoundError(`Couldn't find an active verification code`);
    }

    if (data.verificationCode !== savedCode) {
      throw new BadRequestError('Received invalid verification code');
    }

    const updated = await accountsDb.verifyUser(id)
      .catch((_) => {
        throw new NotFoundError(`Couldn't find user to verify`);
      });

    await verificationCache.code.del(id);
    await verificationCache.isVerified.set(id, updated.verified);
  },
};
