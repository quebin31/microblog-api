import { postsDao as original } from '../posts.dao';
import { mock } from 'jest-mock-extended';

export type { GetAllOptions } from '../posts.dao';

export const postsDao = mock<typeof original>();
