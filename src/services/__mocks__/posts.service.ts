import { postsService as original } from '../posts.service';
import { mock } from 'jest-mock-extended';

export const postsService = mock<typeof original>();
