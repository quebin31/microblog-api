import { verificationDao as original } from '../verification.dao';
import { mockDeep } from 'jest-mock-extended';

export const verificationDao = mockDeep<typeof original>();
