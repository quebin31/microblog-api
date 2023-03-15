import { Comment } from '@prisma/client';
import { createNewCommentData } from '../factories/comments';
import { commentsRepository } from '../../repositories/comments.repository';
import { FullComment } from '../../services/comments.service';

export async function insertTestComment(userId: string, postId: string, overrides?: Partial<Comment>) {
  const data = createNewCommentData({ postId, ...overrides });
  return commentsRepository.createNewComment(data, userId);
}

export type TestCommentsOptions = { qty?: number, draft?: boolean };

export async function insertTestComments(userId: string, postId: string, options?: TestCommentsOptions) {
  const comments: FullComment[] = [];
  const qty = options?.qty ?? 5;
  const draft = options?.draft ?? false;

  for (let i = 0; i < qty; i += 1) {
    const comment = await insertTestComment(userId, postId, { draft });
    comments.push(comment);
  }

  return comments;
}
