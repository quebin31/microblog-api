import { postsRepository as original } from '../posts.repository';
import { mock } from 'jest-mock-extended';

export type { GetAllOptions } from '../posts.repository';

export const postsRepository = mock<typeof original>();
