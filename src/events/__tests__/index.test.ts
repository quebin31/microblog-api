import { eventEmitter, registerEventHandlers } from '../index';
import { handleUserEmailVerificationEvent, UserEmailVerificationEvent } from '../verification';

describe('Event emitter listeners', () => {
  test('contains email verification handler', () => {
    registerEventHandlers();
    const listeners = eventEmitter.listeners(UserEmailVerificationEvent);

    expect(listeners).toHaveLength(1);
    expect(listeners[0]).toEqual(handleUserEmailVerificationEvent);
  });
});
