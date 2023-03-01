import { authMiddleware } from '../auth';
import { AuthPayload, createJwt } from '../../utils/auth';
import config from '../../config';
import { buildNext, buildReq, buildRes } from '../../test/express';
import { Role } from '@prisma/client';

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
