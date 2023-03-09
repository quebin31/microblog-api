import { errorHandler } from '../error';
import { buildExpressParams } from '../../test/express';
import { RejectError, Rejection } from '../../errors';
import { captor } from 'jest-mock-extended';

describe('Error Handler', () => {
  class DummyRejectError extends RejectError {
    constructor(private status: number) {
      super();
    }

    get rejection(): Rejection {
      return {
        status: this.status,
        code: 'internal_server_error',
        message: 'Something went wrong',
      };
    }
  }

  const statuses = [[500], [401], [404]];
  test.each(statuses)(
    'responds with rejection from error if it is a RejectError (example with %p)',
    (status) => {
      const err = new DummyRejectError(status);
      const { req, res, next } = buildExpressParams();

      errorHandler({ stack: true })(err, req, res, next);

      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(status);
      expect(res.json).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith({
        ...err.rejection,
        stack: err.stack,
      });
    });

  test('responds with generic rejection if it is an Error', () => {
    const err = new Error('Oops!');
    const { req, res, next } = buildExpressParams();

    errorHandler({ stack: true })(err, req, res, next);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(<Rejection>{
      status: 500,
      code: 'internal_server_error',
      message: 'Oops!',
      stack: err.stack,
    });
  });

  test('responds with generic rejection if it is something else', () => {
    const err = {};
    const { req, res, next } = buildExpressParams();

    errorHandler({ stack: true })(err, req, res, next);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledTimes(1);
    const json = captor<Rejection>();
    expect(res.json).toHaveBeenCalledWith(json);
    expect(json.value.stack).toBeDefined();
    expect(json.value).toMatchObject({
      status: 500,
      code: 'internal_server_error',
      message: 'Something went wrong',
    });
  });

  test(`doesn't include stack if stack = false (generic error)`, () => {
    const err = new Error('Oops!');
    const { req, res, next } = buildExpressParams();

    errorHandler({ stack: false })(err, req, res, next);

    const json = captor<Rejection>();
    expect(res.json).toHaveBeenCalledWith(json);
    expect(json.value.stack).toBeUndefined();
  });

  test(`doesn't include stack if stack = false (reject error)`, () => {
    const err = new DummyRejectError(400);
    const { req, res, next } = buildExpressParams();

    errorHandler({ stack: false })(err, req, res, next);

    const json = captor<Rejection>();
    expect(res.json).toHaveBeenCalledWith(json);
    expect(json.value.stack).toBeUndefined();
  });
});
