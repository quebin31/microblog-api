import EventEmitter from 'eventemitter3';
import { handleUserEmailVerificationEvent, UserEmailVerificationEvent } from './verification';

export const eventEmitter = new EventEmitter();

export function registerEventHandlers() {
  eventEmitter.on(UserEmailVerificationEvent, handleUserEmailVerificationEvent);
}
