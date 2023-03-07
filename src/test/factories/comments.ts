import { Comment, Post } from '@prisma/client';
import { randomUUID } from 'crypto';
import { faker } from '@faker-js/faker';
import { createUser } from './accounts';
import { createPost } from './posts';
import { FullComment } from '../../services/comments.service';

export function createComment(overrides?: Partial<Comment>): Comment {
  return {
    id: randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
    body: faker.lorem.sentence(6),
    positiveVotes: 0,
    negativeVotes: 0,
    draft: false,
    userId: randomUUID(),
    postId: randomUUID(),
    ...overrides,
  };
}

export function createFullComment(overrides?: Partial<FullComment>): FullComment {
  const { user: maybeUser, post: maybePost, ...rest } = overrides ?? {};
  const user = maybeUser ?? createUser();
  const post: Post = { ...(maybePost ?? createPost()), userId: user.id };

  return {
    user,
    post,
    ...createComment({ userId: user.id, postId: post.id, ...rest }),
  };
}
