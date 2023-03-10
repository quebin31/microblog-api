import { accountsRepository as original } from '../accounts.repository';
import { mock } from 'jest-mock-extended';

export const accountsRepository = mock<typeof original>();
