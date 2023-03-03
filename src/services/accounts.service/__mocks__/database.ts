import { accountsDb as original } from '../database';
import { mock } from 'jest-mock-extended';

export const accountsDb = mock<typeof original>();
