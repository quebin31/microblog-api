import { createUser } from '../../test/factories/accounts';
import { createFullComment, createNewCommentData } from '../../test/factories/comments';
import { CommentResponse, commentsService, mapToCommentResponse } from './index';
import { BadRequestError, NotFoundError } from '../../errors';
import { commentsDb, GetAllOptions } from './database';
import { captor, MockProxy, mockReset } from 'jest-mock-extended';
import { GetAllParams } from '../../schemas/comments';
import { randomUUID } from 'crypto';
import { describe } from 'node:test';
import { createFullPost } from '../../test/factories/posts';

jest.mock('./database');

const commentsDbMock = commentsDb as MockProxy<typeof commentsDb>;

beforeEach(() => {
  mockReset(commentsDbMock);
});

describe('Map comment to response', () => {
  test('transforms comment into a response model', () => {
    const user = createUser({ publicName: true });
    const comment = createFullComment({ user });
    const expected: CommentResponse = {
      id: comment.id,
      postTitle: comment.post.title,
      postId: comment.post.id,
      authorName: comment.user.name,
      authorId: comment.user.id,
      body: comment.body,
      score: comment.positiveVotes - comment.negativeVotes,
      positiveVotes: comment.positiveVotes,
      negativeVotes: comment.negativeVotes,
      totalVotes: comment.positiveVotes + comment.negativeVotes,
      draft: comment.draft,
      createdAt: comment.createdAt,
      lastModifiedAt: comment.updatedAt,
    };

    expect(mapToCommentResponse(comment)).toStrictEqual<CommentResponse>(expected);
  });

  test(`returns name with 'null' if it's not public`, () => {
    const user = createUser({ publicName: false });
    const comment = createFullComment({ user });

    expect(mapToCommentResponse(comment).authorName).toBeNull();
  });

  test(`returns name with 'null' if it's not public and user id doesn't match`, () => {
    const user = createUser({ publicName: false });
    const comment = createFullComment({ user });

    expect(mapToCommentResponse(comment, 'other-uuid').authorName).toBeNull();
  });

  test(`returns name if user id matches (even if it's not public)`, () => {
    const user = createUser({ publicName: false });
    const comment = createFullComment({ user });

    expect(mapToCommentResponse(comment, user.id).authorName).toEqual(user.name);
  });
});

describe('Get all comments', () => {
  test('fails if neither of user or post query params is defined', async () => {
    await expect(commentsService.getAll({})).rejects
      .toEqual(new BadRequestError(`At least one of 'user' or 'post' query params must be defined`));
  });

  test('returns null cursor if array is empty', async () => {
    commentsDbMock.getAll.mockResolvedValue([]);

    const expected = { comments: [], cursor: null };
    await expect(commentsService.getAll({ user: 'self' })).resolves.toEqual(expected);
  });

  test('returns array and non-null cursor from last comment', async () => {
    const comments = [createFullComment(), createFullComment()];
    commentsDbMock.getAll.mockResolvedValue(comments);

    const mappedComments = comments.map((it) => mapToCommentResponse(it));
    const expected = { comments: mappedComments, cursor: comments[1].createdAt };
    await expect(commentsService.getAll({ user: 'self' })).resolves.toEqual(expected);
  });

  test(`filtering user with 'self' is the same as using the current user id`, async () => {
    const params: GetAllParams = { user: 'self' };
    const user = createUser();
    commentsDbMock.getAll.mockResolvedValue([]);

    await commentsService.getAll(params, user.id);

    const options = captor<GetAllOptions>();
    expect(commentsDbMock.getAll).toHaveBeenCalledWith(options);
    expect(options.value).toMatchObject({ user: user.id });
  });

  test('author name is hidden based on whether or not user name is public', async () => {
    const user1 = createUser({ publicName: false });
    const user2 = createUser({ publicName: true });
    const comments = [createFullComment({ user: user1 }), createFullComment({ user: user2 })];
    commentsDbMock.getAll.mockResolvedValue(comments);

    const response = await commentsService.getAll({ post: randomUUID() });
    expect(response.comments[0].authorName).toBeNull();
    expect(response.comments[1].authorName).toEqual(user2.name);
  });

  test('author name is shown if comment is from caller user', async () => {
    const user = createUser({ publicName: false });
    const comments = [createFullComment({ user })];
    commentsDbMock.getAll.mockResolvedValue(comments);

    const response = await commentsService.getAll({ user: user.id }, user.id);
    expect(response.comments[0].authorName).toEqual(user.name);
  });

  test(`sort order defaults to 'desc' if undefined`, async () => {
    commentsDbMock.getAll.mockResolvedValue([]);

    await commentsService.getAll({ post: randomUUID() });

    const options = captor<GetAllOptions>();
    expect(commentsDbMock.getAll).toHaveBeenCalledWith(options);
    expect(options.value.sort).toEqual('desc');
  });

  const takeDefault = 30;
  test(`number of elements to take defaults to ${takeDefault} if not defined`, async () => {
    commentsDbMock.getAll.mockResolvedValue([]);

    await commentsService.getAll({ post: randomUUID() });

    const options = captor<GetAllOptions>();
    expect(commentsDbMock.getAll).toHaveBeenCalledWith(options);
    expect(options.value.take).toEqual(takeDefault);
  });

  test(`include = 'all' only includes published comments if no caller is defined`, async () => {
    commentsDbMock.getAll.mockResolvedValue([]);

    await commentsService.getAll({ post: randomUUID(), include: 'all' });
    await commentsService.getAll({ post: randomUUID() });

    let options = captor<GetAllOptions>();
    expect(commentsDbMock.getAll).toHaveBeenNthCalledWith(1, options);
    expect(options.value.filterDraft).toEqual(false);
    expect(commentsDbMock.getAll).toHaveBeenNthCalledWith(2, options);
    expect(options.value.filterDraft).toEqual(false);
  });

  test(`include = 'all' includes published and draft comments if caller is defined`, async () => {
    const user = createUser();
    commentsDbMock.getAll.mockResolvedValue([]);

    await commentsService.getAll({ post: randomUUID(), include: 'all' }, user.id);
    await commentsService.getAll({ post: randomUUID() }, user.id);

    let options = captor<GetAllOptions>();
    expect(commentsDbMock.getAll).toHaveBeenNthCalledWith(1, options);
    expect(options.value.filterDraft).toBeUndefined();
    expect(commentsDbMock.getAll).toHaveBeenNthCalledWith(2, options);
    expect(options.value.filterDraft).toBeUndefined();
  });

  test(`include = 'published' filters comments that are not drafts`, async () => {
    commentsDbMock.getAll.mockResolvedValue([]);

    await commentsService.getAll({ post: randomUUID(), include: 'published' });

    const options = captor<GetAllOptions>();
    expect(commentsDbMock.getAll).toHaveBeenCalledWith(options);
    expect(options.value.filterDraft).toEqual(false);
  });

  test(`include = 'drafts' filters comments that are drafts only if caller is defined`, async () => {
    commentsDbMock.getAll.mockResolvedValue([]);

    await commentsService.getAll({ post: randomUUID(), include: 'drafts' }, randomUUID());

    const options = captor<GetAllOptions>();
    expect(commentsDbMock.getAll).toHaveBeenCalledWith(options);
    expect(options.value.filterDraft).toEqual(true);
  });

  test(`include = 'drafts' returns early if no caller is defined`, async () => {
    const comments = [createFullComment()];
    commentsDbMock.getAll.mockResolvedValue(comments);

    const params: GetAllParams = { post: randomUUID(), include: 'drafts' };
    const expected = { comments: [], cursor: null };
    await expect(commentsService.getAll(params)).resolves.toEqual(expected);
  });

  test('skips one item if cursor is defined', async () => {
    commentsDbMock.getAll.mockResolvedValue([]);

    await commentsService.getAll({ post: randomUUID() });
    await commentsService.getAll({ post: randomUUID(), cursor: new Date() });

    let options = captor<GetAllOptions>();
    expect(commentsDbMock.getAll).toHaveBeenNthCalledWith(1, options);
    expect(options.value.skip).toEqual(0);

    expect(commentsDbMock.getAll).toHaveBeenNthCalledWith(2, options);
    expect(options.value.skip).toEqual(1);
  });

  test('other params are passed as options to database query', async () => {
    const userId = randomUUID();
    const postId = randomUUID();
    const params: GetAllParams = {
      user: userId,
      post: postId,
      sort: 'asc',
      take: 10,
      cursor: new Date(),
    };

    commentsDbMock.getAll.mockResolvedValue([]);

    await commentsService.getAll(params);

    const options = captor<GetAllOptions>();
    expect(commentsDbMock.getAll).toHaveBeenCalledWith(options);
    expect(options.value).toMatchObject(params);
  });
});

describe('Create new comment', () => {
  test('fails if database creation fails (invalid user or post)', async () => {
    const data = createNewCommentData();
    const user = createUser();

    commentsDbMock.createNewComment.mockRejectedValue(new Error());

    await expect(commentsService.newComment(data, user.id)).rejects
      .toEqual(new NotFoundError('Invalid user or post'));
  });

  test('returns newly created comment on success', async () => {
    const user = createUser({ publicName: false });
    const post = createFullPost({ user });
    const data = createNewCommentData({ postId: post.id });
    const comment = createFullComment({ user, post });

    commentsDbMock.createNewComment.mockResolvedValue(comment);

    const expected = mapToCommentResponse(comment, user.id);
    await expect(commentsService.newComment(data, user.id)).resolves.toEqual(expected);
    expect(expected.authorName).toEqual(user.name);
  });
});
