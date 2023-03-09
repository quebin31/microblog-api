import { NextFunction, Request, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors';
import { verifyJwt } from '../utils/auth';
import config from '../config';
import asyncHandler from 'express-async-handler';
import { verificationService } from '../services/verification.service';

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

async function verifiedMiddlewareAsync(req: Request, res: Response, next: NextFunction) {
  const userId = req.subject!;
  const verified = await verificationService.isVerified(userId);
  if (verified) {
    next();
  } else {
    throw new ForbiddenError('Your account must be verified to use this endpoint');
  }
}

export const verifiedMiddleware = asyncHandler(verifiedMiddlewareAsync);
