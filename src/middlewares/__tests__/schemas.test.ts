import { buildExpressParams, buildReq } from '../../test/express';
import { z } from 'zod';
import { validateBody, validateQuery } from '../schemas';
import { captor } from 'jest-mock-extended';
import { InvalidInputError } from '../../errors';

describe('Validate request body', () => {
  test('calls next with error if schema parsing fails', () => {
    const originalBody = { c: 'hi' };
    const req = buildReq({ body: originalBody });
    const { res, next } = buildExpressParams();
    const schema = z.object({ a: z.string() });
    const validateMiddleware = validateBody(schema);

    validateMiddleware(req, res, next);

    const err = captor<any>();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(err);
    expect(err.value).toBeInstanceOf(InvalidInputError);

    expect(req.body).toStrictEqual(originalBody);
  });

  test('updates request body on successful parse', () => {
    const req = buildReq({ body: { a: 'hi', b: 'extra' } });
    const { res, next } = buildExpressParams();
    const schema = z.object({ a: z.string() });
    const validateMiddleware = validateBody(schema);

    validateMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();

    expect(req.body).toStrictEqual({ a: 'hi' });
  });
});

describe('Validate request query', () => {
  test('calls next with error if schema parsing fails', () => {
    const originalQuery = { a: 'desc' };
    const req = buildReq({ query: originalQuery });
    const { res, next } = buildExpressParams();
    const schema = z.object({ q: z.string() });
    const validateMiddleware = validateQuery(schema);

    validateMiddleware(req, res, next);

    const err = captor<any>();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(err);
    expect(err.value).toBeInstanceOf(InvalidInputError);

    expect(req.query).toStrictEqual(originalQuery);
  });

  test('updates request query on successful parse', () => {
    const req = buildReq({ query: { q: 'hi', b: 'extra' } });
    const { res, next } = buildExpressParams();
    const schema = z.object({ q: z.string() });
    const validateMiddleware = validateQuery(schema);

    validateMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();

    expect(req.query).toStrictEqual({ q: 'hi' });
  });
});
