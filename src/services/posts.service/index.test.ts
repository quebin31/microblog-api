import { mapToPostResponse, postsService } from './index';
import { GetAllOptions, postsDb } from './database';
import { captor, MockProxy, mockReset } from 'jest-mock-extended';
import { GetAllParams } from '../../schemas/posts';
import { randomUUID } from 'crypto';
import { createNewPostData, createPost } from '../../test/factories/posts';
import { createUser } from '../../test/factories/accounts';
import { NotFoundError } from '../../errors';

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

  test('returns array and non-null cursor from last post', async () => {
    const user = createUser();
    const posts = [
      { ...createPost({ userId: user.id }), user },
      { ...createPost({ userId: user.id }), user },
    ];

    postsDbMock.getAll.mockResolvedValue(posts);

    const mappedPosts = posts.map((post) => mapToPostResponse(post));
    const expected = { posts: mappedPosts, cursor: posts[1].createdAt };
    await expect(postsService.getAll({})).resolves.toEqual(expected);
  });

  test(`filtering user with 'self' is the same as using the current user id`, async () => {
    const params: GetAllParams = { user: 'self' };
    const user = createUser();
    postsDbMock.getAll.mockResolvedValue([]);

    await postsService.getAll(params, user.id);

    const options = captor<GetAllOptions>();
    expect(postsDbMock.getAll).toHaveBeenCalledWith(options);
    expect(options.value).toMatchObject({ user: user.id });
  });

  test('author name is hidden based whether or not user name is public', async () => {
    const user1 = createUser({ publicName: false });
    const user2 = createUser({ publicName: true });
    const posts = [
      { ...createPost({ userId: user1.id }), user: user1 },
      { ...createPost({ userId: user2.id }), user: user2 },
    ];

    postsDbMock.getAll.mockResolvedValue(posts);

    const mappedPosts = posts.map((post) => mapToPostResponse(post));
    const expected = { posts: mappedPosts, cursor: posts[1].createdAt };
    await expect(postsService.getAll({})).resolves.toEqual(expected);
    expect(mappedPosts[0].authorName).toBeNull();
    expect(mappedPosts[1].authorName).toEqual(user2.name);
  });

  test('author name is shown if post is from caller user', async () => {
    const user = createUser({ publicName: false });
    const posts = [{ ...createPost({ userId: user.id }), user }];
    postsDbMock.getAll.mockResolvedValue(posts);

    await postsService.getAll({}, user.id);

    const mappedPosts = posts.map((post) => mapToPostResponse(post, user.id));
    const expected = { posts: mappedPosts, cursor: posts[0].createdAt };
    await expect(postsService.getAll({}, user.id)).resolves.toEqual(expected);
    expect(mappedPosts[0].authorName).toEqual(user.name);
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

describe('Create new post', () => {
  test('fails if database creation fails (due to user not existing)', async () => {
    const data = createNewPostData();
    const user = createUser();

    postsDbMock.newPost.mockRejectedValue(new Error());

    await expect(postsService.newPost(data, user.id)).rejects.toEqual(new NotFoundError('Invalid user'));
  });

  test('returns newly created post on success', async () => {
    const user = createUser({ publicName: false });
    const data = createNewPostData();
    const post = { ...createPost({ ...data, userId: user.id }), user };

    postsDbMock.newPost.mockResolvedValue(post);

    const expectedPost = mapToPostResponse(post, user.id);
    await expect(postsService.newPost(data, user.id)).resolves.toEqual(expectedPost);
    expect(expectedPost.authorName).toEqual(user.name);
  });
});
