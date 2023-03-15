import { commentsRepository as original } from '../comments.repository';
import { mock } from 'jest-mock-extended';


export const commentsRepository = mock<typeof original>();
