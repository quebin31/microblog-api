import { commentsService as original } from '../comments.service';
import { mock } from 'jest-mock-extended';

export const commentsService = mock<typeof original>();
