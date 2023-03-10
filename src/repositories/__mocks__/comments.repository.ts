import { commentsRepository as original } from '../comments.repository';
import { mock } from 'jest-mock-extended';

export type { GetAllOptions } from '../comments.repository';

export const commentsRepository = mock<typeof original>();
