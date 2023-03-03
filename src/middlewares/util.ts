import { NextFunction, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';

/**
 * Wraps the received middleware inside a middleware that consumes all errors, either from exceptions
 * or from calls to `next(err)`.
 *
 * @param middleware The middleware that's going to be wrapped.
 */
export function optional(middleware: (req: Request, res: Response, next: NextFunction) => Promise<void> | void) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      await middleware(req, res, (_?: unknown) => next());
    } catch (e) {
      next();
    }
  });
}
