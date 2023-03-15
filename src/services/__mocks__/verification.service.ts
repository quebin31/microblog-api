import { verificationService as original } from '../verification.service';
import { mock } from 'jest-mock-extended';

export const verificationService = mock<typeof original>();
