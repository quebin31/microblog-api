import { accountsDao as original } from '../accounts.dao';
import { mock } from 'jest-mock-extended';

export const accountsDao = mock<typeof original>();
