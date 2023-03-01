import { errorHandler } from '../error';
import { buildNext, buildReq, buildRes } from '../../test/express';
import { RejectError, Rejection } from '../../errors';

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
      const req = buildReq();
      const res = buildRes();
      const next = buildNext();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(status);
      expect(res.json).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith(err.rejection);
    });

  test('responds with generic rejection if it is an Error', () => {
    const err = new Error('Oops!');
    const req = buildReq();
    const res = buildRes();
    const next = buildNext();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(<Rejection>{
      status: 500,
      code: 'internal_server_error',
      message: 'Oops!',
    });
  });

  test('responds with generic rejection if it is something else', () => {
    const err = {};
    const req = buildReq();
    const res = buildRes();
    const next = buildNext();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(<Rejection>{
      status: 500,
      code: 'internal_server_error',
      message: 'Something went wrong',
    });
  });
});
