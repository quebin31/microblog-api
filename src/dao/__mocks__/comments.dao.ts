import { commentsDao as original } from '../comments.dao';
import { mock } from 'jest-mock-extended';

export type { GetAllOptions } from '../comments.dao';

export const commentsDao = mock<typeof original>();
