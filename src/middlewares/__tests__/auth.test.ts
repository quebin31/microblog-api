import { Request, Response } from 'express';
import { authMiddleware } from '../auth';
import { AuthPayload, createJwt, Role } from '../../util/auth';
import config from '../../config';

describe('Auth Middleware', () => {
  test('fails if authorization header is missing', () => {
    const req = <Request>{ headers: {} };
    const next = jest.fn();

    expect(() => authMiddleware(req, <Response>{}, next))
      .toThrowError('Missing bearer access token');
    expect(next).toHaveBeenCalledTimes(0);
  });

  test('fails if access token is not valid JWT', () => {
    const req = <Request>{
      headers: { authorization: 'Bearer not-a-jwt' },
    };
    const next = jest.fn();

    expect(() => authMiddleware(req, <Response>{}, next))
      .toThrowError();
    expect(next).toHaveBeenCalledTimes(0);
  });

  test('fails if JWT payload is invalid', () => {
    const secret = config.jwtSecret;
    const accessToken = createJwt(<AuthPayload>{}, secret);
    const req = <Request>{
      headers: { authorization: `Bearer ${accessToken}` },
    };
    const next = jest.fn();

    expect(() => authMiddleware(req, <Response>{}, next))
      .toThrowError('Received invalid JWT payload');
    expect(next).toHaveBeenCalledTimes(0);
  });

  test('injects user information into the request object if token is valid', () => {
    const secret = config.jwtSecret;
    const payload: AuthPayload = { sub: 'sub', role: Role.Moderator };
    const accessToken = createJwt(payload, secret);
    const req = <Request>{
      headers: { authorization: `Bearer ${accessToken}` },
    };
    const next = jest.fn();

    authMiddleware(req, <Response>{}, next);

    expect(req.subject).toEqual(payload.sub);
    expect(req.role).toEqual(payload.role);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});
