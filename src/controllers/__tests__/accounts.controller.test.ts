import * as controller from '../accounts.controller';
import { accountsService } from '../../services/accounts.service';
import { MockProxy, mockReset } from 'jest-mock-extended';
import { buildExpressParams, buildReq, buildRes } from '../../test/express';
import { randomUUID } from 'crypto';
import { verificationService } from '../../services/verification.service';
import { PatchAccountData, VerificationData } from '../../schemas/accounts';
import {
  createAccountResponse,
  createAuthResponse,
  createSignInData,
  createSignUpData,
} from '../../test/factories/accounts';

jest.mock('../../services/accounts.service');
jest.mock('../../services/verification.service');

const accountsServiceMock = accountsService as MockProxy<typeof accountsService>;
const verificationServiceMock = verificationService as MockProxy<typeof verificationService>;

beforeEach(() => {
  mockReset(accountsServiceMock);
  mockReset(verificationServiceMock);
});

describe('Sign up', () => {
  test('responds with 200 OK with result from service', async () => {
    const result = createAuthResponse();
    const data = createSignUpData();
    const req = buildReq({ body: data });
    const res = buildRes();
    accountsServiceMock.signUp.calledWith(data).mockResolvedValue(result);

    await controller.signUp(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });
});

describe('Sign in', () => {
  test('responds with 200 OK with result from service', async () => {
    const result = createAuthResponse();
    const data = createSignInData();
    const req = buildReq({ body: data });
    const res = buildRes();
    accountsServiceMock.signIn.calledWith(data).mockResolvedValue(result);

    await controller.signIn(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });
});

describe('Resend verification email', () => {
  test('fails if no subject has been defined', async () => {
    const { req, res } = buildExpressParams();
    await expect(controller.resendEmail(req, res)).rejects.toBeInstanceOf(Error);
  });

  test('responds with 204 No Content', async () => {
    const subject = randomUUID();
    const req = buildReq({ subject });
    const res = buildRes();

    await controller.resendEmail(req, res);

    expect(verificationServiceMock.sendVerificationEmail).toHaveBeenCalledWith({ id: subject });
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalledWith();
  });
});

describe('Verify email', () => {
  test('fails if subject is not defined', async () => {
    const { req, res } = buildExpressParams();
    await expect(controller.verifyEmail(req, res)).rejects.toBeInstanceOf(Error);
  });

  test('responds with 204 No Content', async () => {
    const subject = randomUUID();
    const body: VerificationData = { verificationCode: '123456' };
    const req = buildReq({ subject, body });
    const res = buildRes();

    await controller.verifyEmail(req, res);

    expect(verificationServiceMock.verifyEmail).toHaveBeenCalledWith(subject, body);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalledWith();
  });
});

describe('Get account', () => {
  test('responds with 200 OK with undefined subject', async () => {
    const result = createAccountResponse();
    const userId = randomUUID();
    const req = buildReq({ params: { id: userId } });
    const res = buildRes();
    accountsServiceMock.getAccount.calledWith(userId).mockResolvedValue(result);

    await controller.getAccount(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  test('responds with 200 OK with defined subject', async () => {
    const result = createAccountResponse();
    const userId = randomUUID();
    const subject = randomUUID();
    const req = buildReq({ subject, params: { id: userId } });
    const res = buildRes();
    accountsServiceMock.getAccount.calledWith(userId, subject).mockResolvedValue(result);

    await controller.getAccount(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });
});

describe('Patch account', () => {
  test('fails if subject is not defined', async () => {
    const req = buildReq({ params: { id: randomUUID() } });
    const res = buildRes();

    await expect(controller.patchAccount(req, res)).rejects.toBeInstanceOf(Error);
  });

  test('responds with 200 OK with updated data', async () => {
    const subject = randomUUID();
    const userId = subject;
    const body: PatchAccountData = { name: '____' };
    const result = createAccountResponse()
    const req = buildReq({ subject, body, params: { id: userId } });
    const res = buildRes();
    accountsServiceMock.updateAccount.calledWith(userId, subject, body).mockResolvedValue(result);

    await controller.patchAccount(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });
});
