import { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../errors';
import { verifyJwt } from '../utils/auth';
import config from '../config';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const [_, accessToken] = req.headers.authorization?.split(' ') ?? [];
  if (!accessToken) {
    throw new UnauthorizedError('Missing bearer access token');
  }

  try {
    const payload = verifyJwt(accessToken, config.jwtSecret);
    req.subject = payload.sub;
    req.role = payload.role;
    next();
  } catch (e: any) {
    const message = e?.message || 'Couldn\'t verify JWT';
    throw new UnauthorizedError(message);
  }
}
