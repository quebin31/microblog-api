import { NextFunction, Request, Response } from 'express';
import { isRejectError } from '../errors';
import { isNativeError } from 'util/types';
import config from '../config';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  let rejection;
  if (isRejectError(err)) {
    rejection = {
      ...err.rejection,
      stack: config.nodeEnv !== 'production' ? err.stack : undefined,
    };
  } else {
    const resolvedErr = isNativeError(err) ? err : new Error('Something went wrong');
    rejection = {
      status: 500,
      code: 'internal_server_error',
      message: resolvedErr.message,
      stack: config.nodeEnv !== 'production' ? resolvedErr.stack : undefined,
    };
  }

  res.status(rejection.status).json(rejection);
}
