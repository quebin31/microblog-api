import { postsRepository as original } from '../posts.repository';
import { mock } from 'jest-mock-extended';

export const postsRepository = mock<typeof original>();
