import { mapToPostResponse, PostResponse, postsService } from '../posts.service';
import { GetAllOptions, postsRepository } from '../../repositories/posts.repository';
import { captor, MockProxy, mockReset } from 'jest-mock-extended';
import { GetAllParams, PatchPostData } from '../../schemas/posts';
import { randomUUID } from 'crypto';
import { createNewPostData, createPost, createFullPost } from '../../test/factories/posts';
import { createUser } from '../../test/factories/accounts';
import { BadRequestError, NotFoundError } from '../../errors';
import { Role } from '@prisma/client';
import { accountsRepository } from '../../repositories/accounts.repository';

jest.mock('../../repositories/accounts.repository');
jest.mock('../../repositories/posts.repository');

const accountsRepositoryMock = accountsRepository as MockProxy<typeof accountsRepository>;
const postsRepositoryMock = postsRepository as MockProxy<typeof postsRepository>;

beforeEach(() => {
  mockReset(postsRepositoryMock);
});

describe('Map post to response', () => {
  test('transforms post into a response model', () => {
    const user = createUser({ publicName: true });
    const votesOptions = { positiveVotes: 4, negativeVotes: 1 };
    const post = createFullPost({ user, votesOptions });

    const expected: PostResponse = {
      id: post.id,
      authorName: user.name,
      authorId: user.id,
      title: post.title,
      body: post.body,
      score: votesOptions.positiveVotes - votesOptions.negativeVotes,
      positiveVotes: votesOptions.positiveVotes,
      negativeVotes: votesOptions.negativeVotes,
      totalVotes: votesOptions.positiveVotes + votesOptions.negativeVotes,
      draft: post.draft,
      createdAt: post.createdAt,
      lastModifiedAt: post.updatedAt,
    };

    expect(mapToPostResponse(post)).toStrictEqual<PostResponse>(expected);
  });

  test(`returns name with 'null' if it's not public`, () => {
    const user = createUser({ publicName: false });
    const post = createFullPost({ user });

    expect(mapToPostResponse(post).authorName).toBeNull();
  });

  test(`returns name with 'null' if it's not public and user id doesn't match`, () => {
    const user = createUser({ publicName: false });
    const post = createFullPost({ user });

    expect(mapToPostResponse(post, 'other-uuid').authorName).toBeNull();
  });

  test(`returns name if user id matches (even if it's not public)`, () => {
    const user = createUser({ publicName: false });
    const post = createFullPost({ user });

    expect(mapToPostResponse(post, user.id).authorName).toEqual(user.name);
  });
});

describe('Get all posts', () => {
  test('returns null cursor if array is empty', async () => {
    postsRepositoryMock.getAll.mockResolvedValue([]);

    const expected = { posts: [], cursor: null };
    await expect(postsService.getAll({})).resolves.toEqual(expected);
  });

  test('returns array and non-null cursor from last post', async () => {
    const user = createUser();
    const posts = [createFullPost({ user }), createFullPost({ user })];

    postsRepositoryMock.getAll.mockResolvedValue(posts);

    const mappedPosts = posts.map((post) => mapToPostResponse(post));
    const expected = { posts: mappedPosts, cursor: posts[1].createdAt };
    await expect(postsService.getAll({})).resolves.toEqual(expected);
  });

  test(`filtering user with 'self' is the same as using the current user id`, async () => {
    const params: GetAllParams = { user: 'self' };
    const user = createUser();
    postsRepositoryMock.getAll.mockResolvedValue([]);

    await postsService.getAll(params, user.id);

    const options = captor<GetAllOptions>();
    expect(postsRepositoryMock.getAll).toHaveBeenCalledWith(options);
    expect(options.value).toMatchObject({ user: user.id });
  });

  test('author name is hidden based on whether or not user name is public', async () => {
    const user1 = createUser({ publicName: false });
    const user2 = createUser({ publicName: true });
    const posts = [createFullPost({ user: user1 }), createFullPost({ user: user2 })];

    postsRepositoryMock.getAll.mockResolvedValue(posts);

    const response = await postsService.getAll({});
    expect(response.posts[0].authorName).toBeNull();
    expect(response.posts[1].authorName).toEqual(user2.name);
  });

  test('author name is shown if post is from caller user', async () => {
    const user = createUser({ publicName: false });
    const posts = [createFullPost({ user })];
    postsRepositoryMock.getAll.mockResolvedValue(posts);

    const response = await postsService.getAll({}, user.id);
    expect(response.posts[0].authorName).toEqual(user.name);
  });

  test(`sort order defaults to 'desc' if undefined`, async () => {
    postsRepositoryMock.getAll.mockResolvedValue([]);

    await postsService.getAll({});

    const options = captor<GetAllOptions>();
    expect(postsRepositoryMock.getAll).toHaveBeenCalledWith(options);
    expect(options.value.sort).toEqual('desc');
  });

  const takeDefault = 30;
  test(`number of elements to take defaults to ${takeDefault} if not defined`, async () => {
    postsRepositoryMock.getAll.mockResolvedValue([]);

    await postsService.getAll({});

    const options = captor<GetAllOptions>();
    expect(postsRepositoryMock.getAll).toHaveBeenCalledWith(options);
    expect(options.value.take).toEqual(takeDefault);
  });

  test(`include = 'all' only includes published posts if no user is defined`, async () => {
    postsRepositoryMock.getAll.mockResolvedValue([]);

    await postsService.getAll({ include: 'all' });
    await postsService.getAll({}); // defaults to 'all'

    let options = captor<GetAllOptions>();
    expect(postsRepositoryMock.getAll).toHaveBeenNthCalledWith(1, options);
    expect(options.value.filterDraft).toEqual(false);
    expect(postsRepositoryMock.getAll).toHaveBeenNthCalledWith(2, options);
    expect(options.value.filterDraft).toEqual(false);
  });

  test(`include = 'all' includes published and draft posts if user is defined`, async () => {
    const user = createUser();
    postsRepositoryMock.getAll.mockResolvedValue([]);

    await postsService.getAll({ include: 'all' }, user.id);
    await postsService.getAll({}, user.id); // defaults to 'all'

    let options = captor<GetAllOptions>();
    expect(postsRepositoryMock.getAll).toHaveBeenNthCalledWith(1, options);
    expect(options.value.filterDraft).toBeUndefined();
    expect(postsRepositoryMock.getAll).toHaveBeenNthCalledWith(2, options);
    expect(options.value.filterDraft).toBeUndefined();
  });

  test(`include = 'published' filters post that are not drafts`, async () => {
    postsRepositoryMock.getAll.mockResolvedValue([]);

    await postsService.getAll({ include: 'published' });

    const options = captor<GetAllOptions>();
    expect(postsRepositoryMock.getAll).toHaveBeenCalledWith(options);
    expect(options.value.filterDraft).toEqual(false);
  });

  test(`include = 'drafts' filters posts that are drafts only if user is defined`, async () => {
    postsRepositoryMock.getAll.mockResolvedValue([]);

    await postsService.getAll({ include: 'drafts' }, randomUUID());

    const options = captor<GetAllOptions>();
    expect(postsRepositoryMock.getAll).toHaveBeenCalledWith(options);
    expect(options.value.filterDraft).toEqual(true);
  });

  test(`include = 'drafts' returns early if no user is defined`, async () => {
    const posts = [createFullPost()];
    postsRepositoryMock.getAll.mockResolvedValue(posts);

    const expected = { posts: [], cursor: null };
    await expect(postsService.getAll({ include: 'drafts' })).resolves.toEqual(expected);
  });

  test('skips one item if cursor is defined', async () => {
    postsRepositoryMock.getAll.mockResolvedValue([]);

    await postsService.getAll({});
    await postsService.getAll({ cursor: new Date() });

    let options = captor<GetAllOptions>();
    expect(postsRepositoryMock.getAll).toHaveBeenNthCalledWith(1, options);
    expect(options.value.skip).toEqual(0);

    expect(postsRepositoryMock.getAll).toHaveBeenNthCalledWith(2, options);
    expect(options.value.skip).toEqual(1);
  });

  test('other params are passed as options to database query', async () => {
    const userId = randomUUID();
    const params: GetAllParams = {
      user: userId,
      sort: 'asc',
      take: 10,
      cursor: new Date(),
    };

    postsRepositoryMock.getAll.mockResolvedValue([]);

    await postsService.getAll(params);

    const options = captor<GetAllOptions>();
    expect(postsRepositoryMock.getAll).toHaveBeenCalledWith(options);
    expect(options.value).toMatchObject(params);
  });
});

describe('Create new post', () => {
  test('fails if database creation fails (due to user not existing)', async () => {
    const data = createNewPostData();
    const user = createUser();

    postsRepositoryMock.createNewPost.mockRejectedValue(new Error());

    await expect(postsService.newPost(data, user.id)).rejects.toEqual(new NotFoundError('Invalid user'));
  });

  test('returns newly created post on success', async () => {
    const user = createUser({ publicName: false });
    const data = createNewPostData();
    const post = createFullPost({ user });

    postsRepositoryMock.createNewPost.mockResolvedValue(post);

    const expectedPost = mapToPostResponse(post, user.id);
    await expect(postsService.newPost(data, user.id)).resolves.toEqual(expectedPost);
    expect(expectedPost.authorName).toEqual(user.name);
  });
});

describe('Get a single post', () => {
  test(`fails if post with the provided id doesn't exist`, async () => {
    const postId = randomUUID();
    postsRepositoryMock.findById.mockResolvedValue(null);

    await expect(postsService.getPost(postId)).rejects
      .toEqual(new NotFoundError(`Couldn't find post with id ${postId}`));
  });

  test(`fails if post is a draft and user wasn't defined`, async () => {
    const post = createFullPost({ draft: true });
    postsRepositoryMock.findById.mockResolvedValue(post);

    await expect(postsService.getPost(post.id)).rejects
      .toEqual(new NotFoundError(`Couldn't find post with id ${post.id}`));
  });

  test(`fails if post is a draft and user id doesn't match`, async () => {
    const post = createFullPost({ draft: true });
    postsRepositoryMock.findById.mockResolvedValue(post);

    await expect(postsService.getPost(post.id, randomUUID())).rejects
      .toEqual(new NotFoundError(`Couldn't find post with id ${post.id}`));
  });

  test('returns draft if provided user id matches', async () => {
    const post = createFullPost({ draft: true });
    postsRepositoryMock.findById.mockResolvedValue(post);

    const expected = mapToPostResponse(post, post.userId);
    await expect(postsService.getPost(post.id, post.userId)).resolves.toEqual(expected);
  });

  const withUserCases = [[false], [true]];
  test.each(withUserCases)(
    'returns published post (with user defined: %p)',
    async (withUser) => {
      const user = createUser({ publicName: false });
      const post = createFullPost({ user });
      postsRepositoryMock.findById.mockResolvedValue(post);

      const userId = withUser ? post.userId : undefined;
      const expected = mapToPostResponse(post, userId);
      await expect(postsService.getPost(post.id, userId)).resolves.toEqual(expected);
      if (withUser) {
        expect(expected.authorName).toEqual(user.name);
      } else {
        expect(expected.authorName).toBeNull();
      }
    });
});

describe('Update a post', () => {
  test(`fails if draft = true (published post cannot be turned into a draft)`, async () => {
    const post = createPost();
    const data: PatchPostData = { draft: true };

    await expect(postsService.updatePost(post.id, post.userId, data)).rejects
      .toEqual(new BadRequestError('Posts cannot be turned into drafts'));
  });

  test('fails with not found if database update fails', async () => {
    const post = createPost();
    postsRepositoryMock.updatePost.mockRejectedValue(new Error());

    await expect(postsService.updatePost(post.id, post.userId, {})).rejects
      .toEqual(new NotFoundError(`Couldn't find post with id ${post.id} to update`));
  });

  test('returns updated post on success', async () => {
    const user = createUser({ publicName: false });
    const post = createFullPost({ user, draft: true, body: 'old body' });
    const data: PatchPostData = { draft: false, body: 'new body' };
    const updated = { ...post, ...data };
    const expected = mapToPostResponse(updated, user.id);

    postsRepositoryMock.updatePost.mockResolvedValue(updated);

    await expect(postsService.updatePost(post.id, user.id, data)).resolves
      .toEqual(expected);

    expect(expected.authorName).toEqual(user.name);
  });
});

describe('Delete a post', () => {
  test(`fails if post doesn't exist`, async () => {
    const user = createUser();
    const postId = randomUUID();

    accountsRepositoryMock.findById.mockResolvedValue(user);
    postsRepositoryMock.deletePost.mockRejectedValue(new Error());

    await expect(postsService.deletePost(postId, user.id)).rejects
      .toEqual(new NotFoundError(`Couldn't find post with id ${postId} to delete`));
  });

  const roleCases: Role[][] = [[Role.user], [Role.moderator], [Role.admin]];
  test.each(roleCases)('deletes post if it exists (role: %p)', async (role: Role) => {
    const user = createUser({ role });
    const postId = randomUUID();

    accountsRepositoryMock.findById.mockResolvedValue(user);
    postsRepositoryMock.deletePost.mockResolvedValue();

    await postsService.deletePost(postId, user.id);

    const userId = role === 'user' ? user.id : undefined;
    expect(postsRepositoryMock.deletePost).toHaveBeenCalledTimes(1);
    expect(postsRepositoryMock.deletePost).toHaveBeenCalledWith(postId, userId);
  });
});

describe('Vote a post', () => {
  test('fails if database upsert fails', async () => {
    const postId = randomUUID();
    const userId = randomUUID();
    const data = { positive: true };

    postsRepositoryMock.upsertVote.mockRejectedValue(new Error());

    await expect(postsService.putVote(postId, userId, data)).rejects
      .toEqual(new NotFoundError(`Couldn't find post to vote, or user`));
  });

  test('updates or creates vote on success', async () => {
    const postId = randomUUID();
    const userId = randomUUID();
    const data = { positive: false };
    postsRepositoryMock.upsertVote.mockResolvedValue();

    await postsService.putVote(userId, postId, data)

    expect(postsRepositoryMock.upsertVote).toHaveBeenCalledTimes(1);
    expect(postsRepositoryMock.upsertVote).toHaveBeenCalledWith(userId, postId, data);
  });
});

describe('Delete a vote', () => {
  test('fails if database delete fails', async () => {
    const postId = randomUUID();
    const userId = randomUUID();

    postsRepositoryMock.deleteVote.mockRejectedValue(new Error());

    await expect(postsService.deleteVote(postId, userId)).rejects
      .toEqual(new NotFoundError(`Couldn't find related vote for the post or user`));
  });

  test('deletes vote on success', async () => {
    const postId = randomUUID();
    const userId = randomUUID();
    postsRepositoryMock.deleteVote.mockResolvedValue();

    await postsService.deleteVote(userId, postId);

    expect(postsRepositoryMock.deleteVote).toHaveBeenCalledTimes(1);
    expect(postsRepositoryMock.deleteVote).toHaveBeenCalledWith(userId, postId);
  });
});
