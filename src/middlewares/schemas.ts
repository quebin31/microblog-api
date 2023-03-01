import { z } from 'zod';
import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from '../errors';

export function validateSchema(schema: z.Schema) {
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
