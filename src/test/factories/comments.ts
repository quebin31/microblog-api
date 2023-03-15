import { Comment, CommentVote, Post } from '@prisma/client';
import { randomUUID } from 'crypto';
import { faker } from '@faker-js/faker';
import { createUser } from './accounts';
import { createPost } from './posts';
import { CommentResponse, CommentsResponse, FullComment } from '../../services/comments.service';
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

export function createCommentResponse(overrides?: Partial<CommentResponse>): CommentResponse {
  return {
    id: faker.datatype.uuid(),
    authorId: faker.datatype.uuid(),
    authorName: faker.name.firstName(),
    body: faker.lorem.words(6),
    createdAt: new Date(),
    draft: false,
    lastModifiedAt: new Date(),
    negativeVotes: 0,
    positiveVotes: 0,
    postId: faker.datatype.uuid(),
    postTitle: faker.lorem.words(10),
    score: 0,
    totalVotes: 0,
    ...overrides,
  };
}

export function createCommentsResponse(qty: number = 5): CommentsResponse {
  const comments: CommentResponse[] = [];
  for (let i = 0; i < qty; i += 1) {
    comments.push(createCommentResponse());
  }

  return { comments, cursor: comments[comments.length - 1].createdAt };
}
