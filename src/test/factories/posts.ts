import { Post, PostVote } from '@prisma/client';
import { randomUUID } from 'crypto';
import { faker } from '@faker-js/faker';
import { NewPostData } from '../../schemas/posts';
import { createUser } from './accounts';
import { FullPost, PostResponse, PostsResponse } from '../../services/posts.service';

export function createPost(overrides?: Partial<Post>): Post {
  return {
    id: randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
    title: faker.lorem.sentence(6),
    body: faker.lorem.sentence(10),
    draft: false,
    userId: randomUUID(),
    ...overrides,
  };
}

type PostVoteOptions = {
  postId: string,
  positiveVotes?: number,
  negativeVotes?: number,
}

function createPostVotes(options: PostVoteOptions): PostVote[] {
  const votes: PostVote[] = [];

  for (let i = 0; i < (options.positiveVotes ?? 0); i += 1) {
    votes.push({ postId: options.postId, userId: randomUUID(), positive: true });
  }

  for (let i = 0; i < (options.negativeVotes ?? 0); i += 1) {
    votes.push({ postId: options.postId, userId: randomUUID(), positive: false });
  }

  return votes;
}

type FullPostOverrides = Partial<Omit<FullPost, 'votes'>> & {
  votesOptions?: Omit<PostVoteOptions, 'postId'>
}

export function createFullPost(overrides?: FullPostOverrides): FullPost {
  const { user: maybeUser, votesOptions, ...rest } = overrides ?? {};
  const user = maybeUser ?? createUser();
  const post = createPost({ userId: user.id, ...rest });
  const votes = createPostVotes({ postId: post.id, ...votesOptions });
  return { user, votes, ...post };
}

export function createNewPostData(overrides?: Partial<NewPostData>): NewPostData {
  return {
    title: faker.lorem.sentence(6),
    body: faker.lorem.sentence(10),
    draft: false,
    ...overrides,
  };
}

export function createPostResponse(overrides?: Partial<PostResponse>): PostResponse {
  return {
    id: faker.datatype.uuid(),
    authorId: faker.datatype.uuid(),
    authorName: faker.name.firstName(),
    title: faker.lorem.words(10),
    body: faker.lorem.words(6),
    createdAt: new Date(),
    draft: false,
    lastModifiedAt: new Date(),
    negativeVotes: 0,
    positiveVotes: 0,
    score: 0,
    totalVotes: 0,
    ...overrides,
  };
}

export function createPostsResponse(qty: number = 5): PostsResponse {
  const posts: PostResponse[] = [];
  for (let i = 0; i < qty; i += 1) {
    posts.push(createPostResponse());
  }

  return { posts, cursor: posts[posts.length - 1].createdAt };
}
