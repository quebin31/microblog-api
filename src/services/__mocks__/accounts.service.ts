import { accountsService as original } from '../accounts.service';
import { mock } from 'jest-mock-extended';

export const accountsService = mock<typeof original>();
