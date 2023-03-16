import { emailService as original } from '../email.service';
import { mock } from 'jest-mock-extended';

export const emailService = mock<typeof original>();
