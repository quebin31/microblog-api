import { optional } from '../util';
import { NextFunction, Request, Response } from 'express';
import { buildExpressParams } from '../../test/express';

describe('Optional middleware modifier', () => {
  test('calls next without error even if next call contains an error', async () => {
    const optionalMiddleware = optional((_req: Request, _res: Response, next: NextFunction) => {
      next(new Error('oops!'));
    });

    const { req, res, next } = buildExpressParams();

    await optionalMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith()
  });

  test('calls next without error even if middleware throws', async () => {
    const optionalMiddleware = optional((_req: Request, _res: Response, _next: NextFunction) => {
      throw new Error('oops!');
    });

    const { req, res, next } = buildExpressParams();
    await optionalMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith()
  });
});
