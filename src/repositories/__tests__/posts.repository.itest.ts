import { clearDatabase,  } from '../../test/prisma';
import { randomUUID } from 'crypto';
import { GetAllOptions, postsRepository } from '../posts.repository';
import { createNewPostData } from '../../test/factories/posts';
import { captor } from 'jest-mock-extended';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { PatchPostData } from '../../schemas/posts';
import { PutVoteData } from '../../schemas/votes';
import { PostVote } from '@prisma/client';
import { insertTestUser } from '../../test/db/accounts';
import { insertTestPost, insertTestPosts } from '../../test/db/posts';

beforeEach(async () => {
  await clearDatabase();
});

describe('Create new post', () => {
  test(`fails if provided user doesn't exist`, async () => {
    const userId = randomUUID();
    const data = createNewPostData();
    const error = captor<PrismaClientKnownRequestError>();

    await expect(postsRepository.createNewPost(data, userId)).rejects.toEqual(error);
    expect(error.value.code).toEqual('P2025');
    expect(error.value.meta?.cause).toMatchInlineSnapshot(
      `"No 'User' record(s) (needed to inline the relation on 'Post' record(s)) was found for a nested connect on one-to-many relation 'PostToUser'."`,
    );
  });

  test('returns newly created post with user and votes data', async () => {
    const user = await insertTestUser();
    const data = createNewPostData();
    const post = await postsRepository.createNewPost(data, user.id);

    expect(post).toMatchObject({ ...data, user, votes: [] });
  });
});

describe('Get a post', () => {
  test('returns null if no post exists with the given id', async () => {
    const postId = randomUUID();

    await expect(postsRepository.findById(postId)).resolves.toEqual(null);
  });

  test('returns existent post with user and votes data', async () => {
    const user = await insertTestUser();
    const post = await insertTestPost(user.id);

    await expect(postsRepository.findById(post.id)).resolves.toStrictEqual(post);
  });
});

describe('Get multiple posts', () => {
  test('returns empty array if no posts are found', async () => {
    const options: GetAllOptions = { sort: 'desc', skip: 0, take: 10 };
    await expect(postsRepository.getAll(options)).resolves.toEqual([]);
  });

  test('returned posts including user and votes data', async () => {
    const user = await insertTestUser();
    const posts = await insertTestPosts(user.id);

    const options: GetAllOptions = { sort: 'asc', skip: 0, take: posts.length };
    const found = await postsRepository.getAll(options);

    found.forEach((post) => {
      expect(post.user).toStrictEqual(user);
      expect(post.votes).toEqual([]);
    });
  });

  const orderCases: ('desc' | 'asc')[][] = [['desc'], ['asc']];
  test.each(orderCases)('returns posts in %p order', async (order) => {
    const user = await insertTestUser();
    const posts = await insertTestPosts(user.id);
    const expected = order === 'desc' ? posts.reverse() : posts;

    const options: GetAllOptions = { sort: order, skip: 0, take: posts.length };
    await expect(postsRepository.getAll(options)).resolves.toEqual(expected);
  });

  test('returns less posts if skip is non-zero', async () => {
    const user = await insertTestUser();
    const posts = await insertTestPosts(user.id);
    const expected = posts.slice(1);

    const options: GetAllOptions = { sort: 'asc', skip: 1, take: posts.length };
    await expect(postsRepository.getAll(options)).resolves.toEqual(expected);
  });

  test('returns less posts if take is smaller', async () => {
    const user = await insertTestUser();
    const posts = await insertTestPosts(user.id);
    const expected = posts.slice(0, posts.length - 2);

    const options: GetAllOptions = { sort: 'asc', skip: 0, take: posts.length - 2 };
    await expect(postsRepository.getAll(options)).resolves.toEqual(expected);
  });

  test('returns all posts (included drafts) if filter is undefined', async () => {
    const user = await insertTestUser();
    const drafts = await insertTestPosts(user.id, { draft: true });
    const posts = await insertTestPosts(user.id);
    const expected = [...drafts, ...posts];

    const options: GetAllOptions = { sort: 'asc', skip: 0, take: expected.length };
    await expect(postsRepository.getAll(options)).resolves.toEqual(expected);
  });

  const draftCases = [[false], [true]];
  test.each(draftCases)('returns posts filtered by draft = %p', async (draft) => {
    const user = await insertTestUser();
    const drafts = await insertTestPosts(user.id, { draft: true });
    const posts = await insertTestPosts(user.id);
    const expected = draft ? drafts : posts;

    const options: GetAllOptions = {
      sort: 'asc',
      skip: 0,
      take: expected.length,
      filterDraft: draft,
    };

    await expect(postsRepository.getAll(options)).resolves.toEqual(expected);
  });

  test('returns posts starting from cursor if defined', async () => {
    const user = await insertTestUser();
    const posts = await insertTestPosts(user.id);
    const cursor = posts[2].createdAt;
    const expected = posts.slice(2);

    const options: GetAllOptions = { sort: 'asc', skip: 0, take: posts.length, cursor };
    await expect(postsRepository.getAll(options)).resolves.toEqual(expected);
  });

  test('returns posts filtered by user if defined', async () => {
    const user1 = await insertTestUser();
    const user2 = await insertTestUser();
    const user1Posts = await insertTestPosts(user1.id);
    const user2Posts = await insertTestPosts(user2.id);

    const take = user1Posts.length + user2Posts.length;
    const options: GetAllOptions = { sort: 'asc', skip: 0, take, user: user2.id };
    await expect(postsRepository.getAll(options)).resolves.toEqual(user2Posts);
  });
});

describe('Update a post', () => {
  test(`fails if post doesn't exist`, async () => {
    const user = await insertTestUser();
    const postId = randomUUID();
    const error = captor<PrismaClientKnownRequestError>();

    await expect(postsRepository.updatePost(postId, user.id, {})).rejects.toEqual(error);
    expect(error.value.code).toEqual('P2025');
    expect(error.value.meta?.cause).toMatchInlineSnapshot(
      `"No 'Post' record was found for a nested update on relation 'PostToUser'."`,
    );
  });

  test(`fails if post doesn't belong to user`, async () => {
    const user1 = await insertTestUser();
    const user2 = await insertTestUser();
    const post = await insertTestPost(user2.id);
    const error = captor<PrismaClientKnownRequestError>();

    await expect(postsRepository.updatePost(post.id, user1.id, {})).rejects.toEqual(error);
    expect(error.value.code).toEqual('P2025');
    expect(error.value.meta?.cause).toMatchInlineSnapshot(
      `"No 'Post' record was found for a nested update on relation 'PostToUser'."`,
    );
  });

  test('returns updated post with user and votes data', async () => {
    const user = await insertTestUser();
    const post = await insertTestPost(user.id);
    const data: PatchPostData = { body: 'New body' };
    const { updatedAt: origUpdatedAt, ...expected } = { ...post, ...data, user };
    const { updatedAt: lastUpdatedAt, ...received } = await postsRepository.updatePost(
      post.id,
      user.id,
      data,
    );

    expect(received).toStrictEqual(expected);
    expect(received.votes).toEqual([]);
    expect(received.user).toEqual(user);
    expect(lastUpdatedAt.getMilliseconds()).toBeGreaterThan(origUpdatedAt.getMilliseconds());
  });
});

describe('Delete a post', () => {
  test(`fails if post doesn't exist (without user)`, async () => {
    const postId = randomUUID();
    await expect(postsRepository.deletePost(postId)).rejects.toEqual(new Error());
  });

  test(`fails if post doesn't belong to the user`, async () => {
    const user = await insertTestUser();
    const post = await insertTestPost(user.id);
    const otherUserId = randomUUID();

    await expect(postsRepository.deletePost(post.id, otherUserId)).rejects.toEqual(new Error());
    await expect(postsRepository.findById(post.id)).resolves.not.toBeNull();
  });

  test('deletes existent post (without user)', async () => {
    const user = await insertTestUser();
    const post = await insertTestPost(user.id);

    await postsRepository.deletePost(post.id);
    await expect(postsRepository.findById(post.id)).resolves.toBeNull();
  });

  test('deletes existent post with a given user', async () => {
    const user = await insertTestUser();
    const post = await insertTestPost(user.id);

    await postsRepository.deletePost(post.id, user.id);
    await expect(postsRepository.findById(post.id)).resolves.toBeNull();
  });
});

describe('Create/update a post vote', () => {
  test(`fails if user doesn't exist`, async () => {
    const user = await insertTestUser();
    const post = await insertTestPost(user.id);
    const otherUserId = randomUUID();
    const data: PutVoteData = { positive: true };
    const error = captor<PrismaClientKnownRequestError>();

    await expect(postsRepository.upsertVote(post.id, otherUserId, data)).rejects.toEqual(error);
    expect(error.value.code).toEqual('P2025');
    expect(error.value.meta?.cause).toMatchInlineSnapshot(
      `"No 'User' record(s) (needed to inline the relation on 'PostVote' record(s)) was found for a nested connect on one-to-many relation 'PostVoteToUser'."`,
    );
  });

  test(`fails if post doesn't exist`, async () => {
    const user = await insertTestUser();
    const postId = randomUUID();
    const data: PutVoteData = { positive: true };
    const error = captor<PrismaClientKnownRequestError>();

    await expect(postsRepository.upsertVote(postId, user.id, data)).rejects.toEqual(error);
    expect(error.value.code).toEqual('P2025');
    expect(error.value.meta?.cause).toMatchInlineSnapshot(
      `"No 'Post' record(s) (needed to inline the relation on 'PostVote' record(s)) was found for a nested connect on one-to-many relation 'PostToPostVote'."`,
    );
  });

  test(`creates post vote if it doesn't exist yet`, async () => {
    const user = await insertTestUser();
    const post = await insertTestPost(user.id);
    const data: PutVoteData = { positive: true };

    await postsRepository.upsertVote(post.id, user.id, data);
    const updatedPost = await postsRepository.findById(post.id);

    const expectedVote: PostVote = { userId: user.id, postId: post.id, ...data };
    expect(updatedPost?.votes.length).toEqual(1);
    expect(updatedPost?.votes.at(0)).toStrictEqual(expectedVote);
  });

  test('updates post vote if one already exists', async () => {
    const user = await insertTestUser();
    const post = await insertTestPost(user.id);

    await postsRepository.upsertVote(post.id, user.id, { positive: true });
    await postsRepository.upsertVote(post.id, user.id, { positive: false });

    const updatedPost = await postsRepository.findById(post.id);

    const expectedVote: PostVote = { userId: user.id, postId: post.id, positive: false };
    expect(updatedPost?.votes.length).toEqual(1);
    expect(updatedPost?.votes.at(0)).toStrictEqual(expectedVote);
  });
});

describe('Delete a post vote', () => {
  test(`fails if post vote doesn't exist`, async () => {
    const user = await insertTestUser();
    const post = await insertTestPost(user.id);
    const error = captor<PrismaClientKnownRequestError>();

    await expect(postsRepository.deleteVote(post.id, user.id)).rejects.toEqual(error);
    expect(error.value.code).toEqual('P2025');
    expect(error.value.meta?.cause).toMatchInlineSnapshot(`"Record to delete does not exist."`);
  });

  test('deletes existent post vote', async () => {
    const user = await insertTestUser();
    const post = await insertTestPost(user.id);

    await postsRepository.upsertVote(post.id, user.id, { positive: true });
    await postsRepository.deleteVote(post.id, user.id);

    const updatedPost = await postsRepository.findById(post.id);
    expect(updatedPost?.votes.length).toEqual(0);
  });
});
