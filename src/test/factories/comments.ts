import { Comment, CommentVote, Post } from '@prisma/client';
import { randomUUID } from 'crypto';
import { faker } from '@faker-js/faker';
import { createUser } from './accounts';
import { createPost } from './posts';
import { FullComment } from '../../services/comments.service';
import { NewCommentData } from '../../schemas/comments';

export function createComment(overrides?: Partial<Comment>): Comment {
  return {
    id: randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
    body: faker.lorem.sentence(6),
    draft: false,
    userId: randomUUID(),
    postId: randomUUID(),
    ...overrides,
  };
}

type CommentVoteOptions = {
  commentId: string,
  positiveVotes?: number,
  negativeVotes?: number,
}

function createCommentVotes(options: CommentVoteOptions): CommentVote[] {
  const votes: CommentVote[] = [];

  for (let i = 0; i < (options.positiveVotes ?? 0); i += 1) {
    votes.push({ commentId: options.commentId, userId: randomUUID(), positive: true });
  }

  for (let i = 0; i < (options.negativeVotes ?? 0); i += 1) {
    votes.push({ commentId: options.commentId, userId: randomUUID(), positive: false });
  }

  return votes;
}

type FullCommentOverrides = Partial<Omit<FullComment, 'votes'>> & {
  votesOptions?: Omit<CommentVoteOptions, 'commentId'>
}

export function createFullComment(overrides?: FullCommentOverrides): FullComment {
  const { user: maybeUser, post: maybePost, votesOptions, ...rest } = overrides ?? {};
  const user = maybeUser ?? createUser();
  const post: Post = { ...(maybePost ?? createPost()), userId: user.id };
  const comment = createComment({ userId: user.id, postId: post.id, ...rest });
  const votes = createCommentVotes({ commentId: comment.id, ...votesOptions });

  return { user, post, votes, ...comment };
}

export function createNewCommentData(overrides?: Partial<NewCommentData>): NewCommentData {
  return {
    postId: randomUUID(),
    body: faker.lorem.sentence(6),
    draft: false,
    ...overrides,
  };
}
