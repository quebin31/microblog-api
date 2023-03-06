import { Post } from '@prisma/client';
import { randomUUID } from 'crypto';
import { faker } from '@faker-js/faker';
import { NewPostData } from '../../schemas/posts';

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

export function createNewPostData(overrides?: Partial<NewPostData>): NewPostData {
  return {
    title: faker.lorem.sentence(6),
    body: faker.lorem.sentence(10),
    draft: false,
    ...overrides,
  };
}
