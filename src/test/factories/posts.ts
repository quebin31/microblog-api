import { Post, PostVote } from '@prisma/client';
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
