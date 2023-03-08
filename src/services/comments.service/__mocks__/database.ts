import { commentsDb as original } from '../database';
import { mock } from 'jest-mock-extended';

export type { GetAllOptions } from '../database';

export const commentsDb = mock<typeof original>();
