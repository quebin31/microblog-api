import { Server } from 'http';
import { SignUpData } from '../../schemas/accounts';
import { createSignUpData } from '../factories/accounts';
import request from 'supertest';
import { AuthResponse } from '../../services/accounts.service';
import { verificationRepository } from '../../repositories/verification.repository';
import { sleep } from '../../utils/async';
import { prisma } from '../../prisma';
import { Role } from '@prisma/client';

export async function signUp(server: Server, data?: SignUpData): Promise<AuthResponse> {
  const signUpData = data ?? createSignUpData();
  const response = await request(server)
    .post('/api/v1/accounts/sign-up')
    .send(signUpData)
    .expect(200);
  return response.body;
}

export async function verifyUser(server: Server, id: string, token: string) {
  // Wait for verification code to be available
  await sleep(10);
  const verificationCode = await verificationRepository.code.get(id);
  await request(server)
    .post('/api/v1/accounts/verify-email')
    .auth(token, { type: 'bearer' })
    .send({ verificationCode })
    .expect(204);
}

/**
 * Needed for testing endpoints that act different based on whether an account is an admin
 * or not. There's no way in the API to sign up as an admin, so this registers a new account
 * and manually changes the role of this account to be an admin.
 *
 * @param server The server where the request to sign up will be made.
 * @param data Optional {@link SignUpData sign up data}.
 */
export async function signUpAdmin(server: Server, data?: SignUpData) {
  const signUpData = data ?? createSignUpData();
  const response = await request(server)
    .post('/api/v1/accounts/sign-up')
    .send(signUpData)
    .expect(200);

  const authResponse: AuthResponse = response.body;
  await prisma.user.update({
    where: { id: authResponse.id },
    data: { verified: true, role: Role.admin },
  });

  return authResponse;
}
