import { z } from 'zod';
import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from '../errors';

export function validateBody(schema: z.Schema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new BadRequestError(`Invalid input: ${result.error.message}`));
    } else {
      req.body = result.data;
      next();
    }
  };
}

export function validateQuery(schema: z.Schema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(new BadRequestError(`Invalid query: ${result.error.message}`));
    } else {
      req.query = result.data;
      next();
    }
  };
}
