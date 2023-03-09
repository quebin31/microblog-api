import {verificationService as original } from '../verification.service';
import { mock } from 'jest-mock-extended';

export * from './verification.service';

export const verificationService = mock<typeof original>();
