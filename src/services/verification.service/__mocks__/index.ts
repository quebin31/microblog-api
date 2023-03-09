import {verificationService as original } from '../index';
import { mock } from 'jest-mock-extended';

export * from './index';

export const verificationService = mock<typeof original>();
