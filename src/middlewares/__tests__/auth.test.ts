import { authMiddleware, verifiedMiddleware } from '../auth';
import { AuthPayload, createJwt } from '../../utils/auth';
import config from '../../config';
import { buildExpressParams, buildNext, buildReq, buildRes } from '../../test/express';
import { Role } from '@prisma/client';
import { verificationService } from '../../services/verification.service';
import { captor, MockProxy } from 'jest-mock-extended';
import { ForbiddenError } from '../../errors';
import { randomUUID } from 'crypto';

jest.mock('../../services/verification.service');

const verificationServiceMock = verificationService as MockProxy<typeof verificationService>;

describe('Auth Middleware', () => {
  test('fails if authorization header is missing', () => {
    const req = buildReq({ headers: {} });
    const res = buildRes();
    const next = buildNext();

    expect(() => authMiddleware(req, res, next))
      .toThrowError('Missing bearer access token');
    expect(next).toHaveBeenCalledTimes(0);
  });

  test('fails if access token is not valid JWT', () => {
    const req = buildReq({ headers: { authorization: 'Bearer not-a-jwt' } });
    const res = buildRes();
    const next = buildNext();

    expect(() => authMiddleware(req, res, next)).toThrowError();
    expect(next).toHaveBeenCalledTimes(0);
  });

  test('fails if JWT payload is invalid', () => {
    const secret = config.jwtSecret;
    const accessToken = createJwt(<AuthPayload>{}, secret);
    const req = buildReq({ headers: { authorization: `Bearer ${accessToken}` } });
    const res = buildRes();
    const next = buildNext();

    expect(() => authMiddleware(req, res, next))
      .toThrowError('Received invalid JWT payload');
    expect(next).toHaveBeenCalledTimes(0);
  });

  test('injects user information into the request object if token is valid', () => {
    const secret = config.jwtSecret;
    const payload: AuthPayload = { sub: 'sub', role: Role.moderator };
    const accessToken = createJwt(payload, secret);
    const req = buildReq({ headers: { authorization: `Bearer ${accessToken}` } });
    const res = buildRes();
    const next = buildNext();

    authMiddleware(req, res, next);

    expect(req.subject).toEqual(payload.sub);
    expect(req.role).toEqual(payload.role);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});

describe('Verified middleware', () => {
  test('depends on a defined subject', async () => {
    const { req, res, next } = buildExpressParams();
    await verifiedMiddleware(req, res, next);

    const err = captor<any>();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(err);
    expect(err.value).toBeInstanceOf(Error);
  });

  test('throws a forbidden error if subject is not verified', async () => {
    const req = buildReq({ subject: randomUUID() });
    const { res, next } = buildExpressParams();
    verificationServiceMock.isVerified.mockResolvedValue(false);

    await verifiedMiddleware(req, res, next);

    const err = captor<any>();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(err);
    expect(err.value).toBeInstanceOf(ForbiddenError);
    expect(err.value).toEqual(new ForbiddenError('Your account must be verified to use this endpoint'));
  });

  test('continues with next if user is verified', async () => {
    const req = buildReq({ subject: randomUUID() });
    const { res, next } = buildExpressParams();

    verificationServiceMock.isVerified.mockResolvedValue(true);

    await verifiedMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});
