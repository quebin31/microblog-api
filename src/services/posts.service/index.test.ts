import { mapToPostResponse, postsService } from './index';
import { GetAllOptions, postsDb } from './database';
import { captor, MockProxy, mockReset } from 'jest-mock-extended';
import { GetAllParams } from '../../schemas/posts';
import { randomUUID } from 'crypto';
import { createPost } from '../../test/factories/posts';

jest.mock('./database');

const postsDbMock = postsDb as MockProxy<typeof postsDb>;

beforeEach(() => {
  mockReset(postsDbMock);
});

describe('Get all posts', () => {
  test('returns null cursor if array is empty', async () => {
    postsDbMock.getAll.mockResolvedValue([]);

    const expected = { posts: [], cursor: null };
    await expect(postsService.getAll({})).resolves.toEqual(expected);
  });

  test('returns non-null cursor from last post', async () => {
    const posts = [createPost(), createPost()];
    postsDbMock.getAll.mockResolvedValue(posts);

    const expected = { posts: posts.map(mapToPostResponse), cursor: posts[1].createdAt };
    await expect(postsService.getAll({})).resolves.toEqual(expected);
  });

  test(`filtering user with 'self' is the same as using the current user id`, async () => {
    const params: GetAllParams = { user: 'self' };
    const userId = randomUUID();
    const posts = [createPost({ userId }), createPost({ userId })];
    postsDbMock.getAll.mockResolvedValue(posts);

    const expected = { posts: posts.map(mapToPostResponse), cursor: posts[1].createdAt };
    await expect(postsService.getAll(params, userId)).resolves.toEqual(expected);

    const options = captor<GetAllOptions>();
    expect(postsDbMock.getAll).toHaveBeenCalledWith(options);
    expect(options.value).toMatchObject({ user: userId });
  });

  test(`sort order defaults to 'desc' if undefined`, async () => {
    postsDbMock.getAll.mockResolvedValue([]);

    await postsService.getAll({});

    const options = captor<GetAllOptions>();
    expect(postsDbMock.getAll).toHaveBeenCalledWith(options);
    expect(options.value).toMatchObject({ sort: 'desc' });
  });

  const takeDefault = 30;
  test(`number of elements to take defaults to ${takeDefault} if not defined`, async () => {
    postsDbMock.getAll.mockResolvedValue([]);

    await postsService.getAll({});

    const options = captor<GetAllOptions>();
    expect(postsDbMock.getAll).toHaveBeenCalledWith(options);
    expect(options.value).toMatchObject({ take: takeDefault });
  });

  test(`include = 'all' doesn't filter posts`, async () => {
    postsDbMock.getAll.mockResolvedValue([]);

    await postsService.getAll({ include: 'all' });
    await postsService.getAll({}); // defaults to 'all'

    let options = captor<GetAllOptions>();
    expect(postsDbMock.getAll).toHaveBeenNthCalledWith(1, options);
    expect(options.value.filterDraft).toBeUndefined();
    expect(postsDbMock.getAll).toHaveBeenNthCalledWith(2, options);
    expect(options.value.filterDraft).toBeUndefined();
  });

  test(`include = 'published' filters post that are not drafts`, async () => {
    postsDbMock.getAll.mockResolvedValue([]);

    await postsService.getAll({ include: 'published' });

    const options = captor<GetAllOptions>();
    expect(postsDbMock.getAll).toHaveBeenCalledWith(options);
    expect(options.value).toMatchObject({ filterDraft: false });
  });

  test(`include = 'drafts' filters posts that are drafts`, async () => {
    postsDbMock.getAll.mockResolvedValue([]);

    await postsService.getAll({ include: 'drafts' });

    const options = captor<GetAllOptions>();
    expect(postsDbMock.getAll).toHaveBeenCalledWith(options);
    expect(options.value).toMatchObject({ filterDraft: true });
  });

  test('other params are passed as options to database query', async () => {
    const userId = randomUUID();
    const params: GetAllParams = { user: userId, cursor: new Date() };

    postsDbMock.getAll.mockResolvedValue([]);

    await postsService.getAll(params);

    const options = captor<GetAllOptions>();
    expect(postsDbMock.getAll).toHaveBeenCalledWith(options);
    expect(options.value).toMatchObject(params);
  });
});
