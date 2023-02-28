import { Response } from 'express';

export type ErrorCode = 'internal_server_error'
  | 'unauthorized';

export type Rejection = {
  [key: string]: unknown
  status: number,
  code: ErrorCode,
  message: string,
}

export abstract class RejectError extends Error {

  abstract get rejection(): Rejection

  public reject(res: Response) {
    const { status, ...rest } = this.rejection;
    res.status(status).json(rest);
  }
}

export function isRejectError(err: unknown): err is RejectError {
  const castedErr = err as RejectError;
  return castedErr.rejection !== undefined && castedErr.reject !== undefined;
}

export class UnauthorizedError extends RejectError {
  get rejection(): Rejection {
    return { status: 401, code: 'unauthorized', message: this.message };
  }
}
