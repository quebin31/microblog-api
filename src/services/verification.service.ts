import sendGridMail from '@sendgrid/mail';
import config from '../config';
import { prisma } from '../prisma';
import { BadRequestError, NotFoundError, TooManyRequestsError } from '../errors';
import redisClient from '../redis';
import { customAlphabet } from 'nanoid/async';
import { nolookalikes } from 'nanoid-dictionary';
import { VerificationData } from '../schemas/accounts';

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

export const verificationCache = {
  isVerifiedKey: (id: string) => `verification:${id}:isVerified`,
  requestedAtKey: (id: string) => `verification:${id}:requestedAt`,
  codeKey: (id: string) => `verification:${id}:code`,
  expiration: 24 * 60 * 60 * 1000, // 24 hours

  isVerified: {
    get: async (id: string) => redisClient.get(verificationCache.isVerifiedKey(id)),
    set: async (id: string, verified: boolean) => {
      const key = verificationCache.isVerifiedKey(id);
      return redisClient.set(key, `${verified}`, { EX: verificationCache.expiration });
    },
  },

  requestedAt: {
    get: async (id: string) => redisClient.get(verificationCache.requestedAtKey(id)),
    set: async (id: string, timestamp: number) => {
      const key = verificationCache.requestedAtKey(id);
      return redisClient.set(key, `${timestamp}`, { EX: verificationCache.expiration });
    },
  },

  code: {
    get: async (id: string) => redisClient.get(verificationCache.codeKey(id)),
    del: async (id: string) => redisClient.del(verificationCache.codeKey(id)),
    set: async (id: string, code: string) => {
      const key = verificationCache.codeKey(id);
      return redisClient.set(key, code, { EX: verificationCache.expiration });
    },
  },
};

export async function isVerified(id: string): Promise<boolean> {
  const isVerified = await verificationCache.isVerified.get(id);
  if (isVerified !== null) {
    return isVerified === 'true';
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (user === null) {
    throw new NotFoundError(`Couldn't find user to check verification`);
  }

  await verificationCache.isVerified.set(id, user.verified);
  return user.verified;
}

export type VerificationInput = { id: string, email?: string }

export async function sendVerificationEmail(input: VerificationInput) {
  const { id, email: maybeEmail } = input;

  if (await isVerified(id)) {
    throw new BadRequestError('User has already been verified');
  }

  let email;
  if (maybeEmail !== undefined) {
    email = maybeEmail;
  } else {
    const user = await prisma.user.findUnique({ where: { id } });
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
}

export async function verifyEmail(id: string, data: VerificationData) {
  const savedCode = await verificationCache.code.get(id);
  if (savedCode === null) {
    throw new NotFoundError(`Couldn't find an active verification code`);
  }

  if (data.verificationCode !== savedCode) {
    throw new BadRequestError('Received invalid verification code');
  }

  const updated = await prisma.user
    .update({
      where: { id },
      data: { verified: true },
    })
    .catch((_) => {
      throw new NotFoundError(`Couldn't find user to verify`);
    });

  await verificationCache.code.del(id);
  await verificationCache.isVerified.set(id, updated.verified);
}
