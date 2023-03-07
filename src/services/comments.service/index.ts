import { Comment, Post, User } from '@prisma/client';
import { omit } from '../../utils/types';

export type CommentResponse = {
  id: string,
  postTitle: string,
  postId: string,
  authorName: string | null,
  authorId: string,
  body: string,
  score: number,
  positiveVotes: number,
  negativeVotes: number,
  totalVotes: number,
  draft: boolean,
  createdAt: Date,
  lastModifiedAt: Date,
}

export type CommentsResponse = {
  comments: CommentResponse[],
  cursor: Date | null,
}

export type FullComment = Comment & { post: Post, user: User }

export function mapToCommentResponse(comment: FullComment, callerId?: string): CommentResponse {
  return {
    ...omit(comment, ['post', 'user', 'userId', 'updatedAt']),
    postTitle: comment.post.title,
    postId: comment.post.id,
    authorName: comment.user.publicName || comment.user.id === callerId ? comment.user.name : null,
    authorId: comment.user.id,
    score: comment.positiveVotes - comment.negativeVotes,
    totalVotes: comment.positiveVotes + comment.negativeVotes,
    lastModifiedAt: comment.updatedAt,
  };
}

export const commentsService = {};
