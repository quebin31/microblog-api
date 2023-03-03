import sendGridMail from '@sendgrid/mail';
import config from '../config';
import { prisma } from '../prisma';
import { BadRequestError, NotFoundError, TooManyRequestsError } from '../errors';
import redisClient from '../redis';
import { customAlphabet } from 'nanoid/async';
import { nolookalikes } from 'nanoid-dictionary';

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

const verificationIsVerifiedKey = (id: string) => `verification:${id}:isVerified`;
const verificationLastTimestampKey = (id: string) => `verification:${id}:lastTimestamp`;
const verificationCodeKey = (id: string) => `verification:${id}:code`;

export async function isVerified(id: string): Promise<boolean> {
  const isVerified = await redisClient.get(verificationIsVerifiedKey(id));
  if (isVerified !== null) {
    return isVerified === 'true';
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (user === null) {
    throw new NotFoundError(`Couldn't find user to check verification`);
  }

  const expiration = 24 * 60 * 60 * 1000; // 24 hours
  await redisClient.set(verificationIsVerifiedKey(id), user.verified.toString(), { EX: expiration });
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

  const lastTimestamp = await redisClient.get(verificationLastTimestampKey(id));
  if (lastTimestamp !== null && parseInt(lastTimestamp) + 60 * 1000 > Date.now()) {
    throw new TooManyRequestsError('Email verifications can only be sent every 60 seconds');
  }

  const verificationCode = await codeGenerator();
  const expiration = 24 * 60 * 60 * 1000; // 24 hours
  await redisClient.set(verificationLastTimestampKey(id), Date.now().toString(), { EX: expiration });
  await redisClient.set(verificationCodeKey(id), verificationCode, { EX: expiration });
  await sendEmailWithCode(email, verificationCode);
}
