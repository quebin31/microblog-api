import { NextFunction, Request, Response } from 'express';
import { isRejectError, Rejection } from '../errors';
import { isNativeError } from 'util/types';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (isRejectError(err)) {
    err.reject(res);
  } else {
    const resolvedErr = isNativeError(err) ? err : new Error('Something went wrong');
    const rejection: Rejection = {
      status: 500,
      code: 'internal_server_error',
      message: resolvedErr.message,
    };

    res.status(rejection.status).json(rejection);
  }
}
