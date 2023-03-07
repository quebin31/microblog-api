import { isRejectError, RejectError, Rejection } from '../index';

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
});
