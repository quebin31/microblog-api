import { VerificationInput } from '../services/verification.service';
import { verificationService } from '../services/verification.service';
import logger from '../logger';

export const UserEmailVerificationEvent = Symbol('user_email_verification_event');

export async function handleUserEmailVerificationEvent(input: VerificationInput) {
  try {
    await verificationService.sendVerificationEmail(input);
  } catch (e) {
    logger.warn(`Failed to send verification email ${e}`);
  }
}
