import sendGridMail from '@sendgrid/mail';
import config from '../config';
import { customAlphabet } from 'nanoid/async';
import { nolookalikes } from 'nanoid-dictionary';
import { BadRequestError, NotFoundError, TooManyRequestsError } from '../errors';
import { VerificationData } from '../schemas/accounts';
import { verificationDao } from '../dao/verification.dao';
import { accountsDao } from '../dao/accounts.dao';

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
    const isVerified = await verificationDao.isVerified.get(id);
    if (isVerified !== null) {
      return isVerified;
    }

    const user = await accountsDao.findById(id);
    if (!user) {
      throw new NotFoundError(`Couldn't find user to check verification`);
    }

    await verificationDao.isVerified.set(id, user.verified);
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
      const user = await accountsDao.findById(id);
      if (!user) {
        throw new NotFoundError(`Couldn't find user to send email`);
      }

      email = user.email;
    }

    const requestedAt = await verificationDao.requestedAt.get(id);
    if (requestedAt !== null && requestedAt + 60 * 1000 > Date.now()) {
      throw new TooManyRequestsError('Email verifications can only be sent every 60 seconds');
    }

    const verificationCode = await codeGenerator();
    await verificationDao.requestedAt.set(id, Date.now());
    await verificationDao.code.set(id, verificationCode);
    await sendEmailWithCode(email, verificationCode);
  },

  async verifyEmail(id: string, data: VerificationData) {
    const savedCode = await verificationDao.code.get(id);
    if (savedCode === null) {
      throw new NotFoundError(`Couldn't find an active verification code`);
    }

    if (data.verificationCode !== savedCode) {
      throw new BadRequestError('Received invalid verification code');
    }

    const updated = await accountsDao.verifyUser(id)
      .catch((_) => {
        throw new NotFoundError(`Couldn't find user to verify`);
      });

    await verificationDao.code.del(id);
    await verificationDao.isVerified.set(id, updated.verified);
  },
};