import sendGridMail from '@sendgrid/mail';
import config from '../config';
import { prisma } from '../prisma';
import { NotFoundError, TooManyRequestsError } from '../errors';
import redisClient from '../redis';
import { nanoid } from 'nanoid';

sendGridMail.setApiKey(config.emailApiKey);

async function sendEmailWithCode(email: string, code: string) {
  return sendGridMail.send({
    to: email,
    from: 'kevindelcastillo@ravn.co',
    subject: 'Confirm your Microblog account',
    text: `Confirmation code: ${code}`,
    html: `Confirmation code: <strong>${code}</strong>`,
  });
}

const verificationLastTimestampKey = (id: string) => `verification:${id}:lastTimestamp`;
const verificationCodeKey = (id: string) => `verification:${id}:code`;

export async function sendVerificationEmail(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new NotFoundError(`Couldn't find user to send email`);
  }

  const lastTimestamp = await redisClient.get(verificationLastTimestampKey(user.id));
  if (lastTimestamp !== null && parseInt(lastTimestamp) + 60 * 1000 > Date.now()) {
    throw new TooManyRequestsError('Email verifications can only be sent every 60 seconds');
  }

  const code = nanoid(6);
  const expireAt = Date.now() + 24 * 60 * 60 * 1000;
  await redisClient.set(verificationLastTimestampKey(id), Date.now().toString(), { EX: expireAt });
  await redisClient.set(verificationCodeKey(id), code, { EX: expireAt });
  await sendEmailWithCode(user.email, code);
}
