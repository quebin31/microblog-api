import { isRejectError, RejectError, Rejection } from '../index';
import { buildRes } from '../../test/express';

describe('Reject errors', () => {
  class DummyRejectError extends RejectError {
    get rejection(): Rejection {
      return {
        status: 500,
        code: 'internal_server_error',
        message: 'Something went wrong',
      };
    }
  }

  test('rejects response with received rejection', () => {
    const res = buildRes();
    const err = new DummyRejectError();

    err.reject(res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(err.rejection);
  });

  test('type guard returns true for reject errors', () => {
    expect(isRejectError(new DummyRejectError())).toBeTruthy();
  });

  test('type guard return false for other types', () => {
    expect(isRejectError(new Error())).toBeFalsy();
    expect(isRejectError({})).toBeFalsy();

    const closeToReject = { rejection: {}, reject: {} };
    expect(isRejectError(closeToReject)).toBeFalsy();
  });
});
