import { eventEmitter, startCollectingEvents } from '../index';
import { handleUserEmailVerificationEvent, UserEmailVerificationEvent } from '../verification';

describe('Event emitter listeners', () => {
  test('contains email verification handler', () => {
    startCollectingEvents();
    const listeners = eventEmitter.listeners(UserEmailVerificationEvent);

    expect(listeners).toHaveLength(1);
    expect(listeners[0]).toEqual(handleUserEmailVerificationEvent);
  });
});
