import { Response } from 'express';
import { isNativeError } from 'util/types';

export type ErrorCode = 'internal_server_error'
  | 'unauthorized'
  | 'bad_request'
  | 'not_found'
  | 'too_many_requests'

export type Rejection = {
  [key: string]: unknown
  status: number,
  code: ErrorCode,
  message: string,
}

export abstract class RejectError extends Error {

  abstract get rejection(): Rejection

  public reject(res: Response) {
    res.status(this.rejection.status).json(this.rejection);
  }
}

export function isRejectError(err: unknown): err is RejectError {
  const castedErr = err as RejectError;
  return isNativeError(err)
    && castedErr.rejection !== undefined
    && castedErr.reject !== undefined;
}

export class UnauthorizedError extends RejectError {
  get rejection(): Rejection {
    return { status: 401, code: 'unauthorized', message: this.message };
  }
}

export class BadRequestError extends RejectError {
  get rejection(): Rejection {
    return { status: 400, code: 'bad_request', message: this.message };
  }
}

export class NotFoundError extends RejectError {
  get rejection(): Rejection {
    return { status: 404, code: 'not_found', message: this.message };
  }
}

export class TooManyRequestsError extends RejectError {
  get rejection(): Rejection {
    return { status: 429, code: 'too_many_requests', message: this.message };
  }
}
