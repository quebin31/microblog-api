import { verificationCache as original } from '../cache';
import { mockDeep } from 'jest-mock-extended';

export const verificationCache = mockDeep<typeof original>();
