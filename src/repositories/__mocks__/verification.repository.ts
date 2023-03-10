import { verificationRepository as original } from '../verification.repository';
import { mockDeep } from 'jest-mock-extended';

export const verificationRepository = mockDeep<typeof original>();
