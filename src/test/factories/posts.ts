import { Post } from '@prisma/client';
import { randomUUID } from 'crypto';
import { faker } from '@faker-js/faker';
import { NewPostData } from '../../schemas/posts';
import { createUser } from './accounts';
import { FullPost } from '../../services/posts.service';

export function createPost(overrides?: Partial<Post>): Post {
  return {
    id: randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
    title: faker.lorem.sentence(6),
    body: faker.lorem.sentence(10),
    positiveVotes: 0,
    negativeVotes: 0,
    draft: false,
    userId: randomUUID(),
    ...overrides,
  };
}

export function createFullPost(overrides?: Partial<FullPost>): FullPost {
  const { user: maybeUser, ...rest } = overrides ?? {};
  const user = maybeUser ?? createUser();
  return { user, ...createPost({ userId: user.id, ...rest }) };
}

export function createNewPostData(overrides?: Partial<NewPostData>): NewPostData {
  return {
    title: faker.lorem.sentence(6),
    body: faker.lorem.sentence(10),
    draft: false,
    ...overrides,
  };
}
