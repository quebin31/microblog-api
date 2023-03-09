import {
  BadRequestError, ForbiddenError,
  isRejectError,
  NotFoundError,
  RejectError,
  Rejection, TooManyRequestsError,
  UnauthorizedError,
} from '../index';

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

  test('type guard returns true for reject errors', () => {
    expect(isRejectError(new DummyRejectError())).toBeTruthy();
  });

  test('type guard return false for other types', () => {
    expect(isRejectError(new Error())).toBeFalsy();
    expect(isRejectError({})).toBeFalsy();

    const closeToReject = { rejection: {}, reject: {} };
    expect(isRejectError(closeToReject)).toBeFalsy();
  });

  test('unauthorized error rejection', () => {
    const message = 'missing token';
    const err = new UnauthorizedError(message);
    expect(err.rejection).toStrictEqual<Rejection>({
      status: 401,
      code: 'unauthorized',
      message,
    });
  });

  test('bad request error rejection', () => {
    const message = 'bad request!';
    const err = new BadRequestError(message);
    expect(err.rejection).toStrictEqual<Rejection>({
      status: 400,
      code: 'bad_request',
      message,
    });
  });

  test('not found error rejection', () => {
    const message = 'invalid user';
    const err = new NotFoundError(message);
    expect(err.rejection).toStrictEqual<Rejection>({
      status: 404,
      code: 'not_found',
      message,
    });
  });

  test('too many requests error rejection', () => {
    const message = 'hold on';
    const err = new TooManyRequestsError(message);
    expect(err.rejection).toStrictEqual<Rejection>({
      status: 429,
      code: 'too_many_requests',
      message,
    });
  });

  test('forbidden error rejection', () => {
    const message = 'nope';
    const err = new ForbiddenError(message);
    expect(err.rejection).toStrictEqual<Rejection>({
      status: 403,
      code: 'forbidden',
      message,
    });
  });
});
