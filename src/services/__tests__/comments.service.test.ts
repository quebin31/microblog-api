import { createUser } from '../../test/factories/accounts';
import { CommentResponse, commentsService, mapToCommentResponse } from '../comments.service';
import { BadRequestError, NotFoundError } from '../../errors';
import { commentsRepository, GetAllOptions } from '../../repositories/comments.repository';
import { captor, MockProxy, mockReset } from 'jest-mock-extended';
import { GetAllParams, PatchCommentData } from '../../schemas/comments';
import { randomUUID } from 'crypto';
import { createFullPost } from '../../test/factories/posts';
import { Role } from '@prisma/client';
import { accountsRepository } from '../../repositories/accounts.repository';
import {
  createComment,
  createFullComment,
  createNewCommentData,
} from '../../test/factories/comments';


jest.mock('../../repositories/comments.repository');
jest.mock('../../repositories/accounts.repository');

const commentsDaoMock = commentsRepository as MockProxy<typeof commentsRepository>;
const accountsDaoMock = accountsRepository as MockProxy<typeof accountsRepository>;

beforeEach(() => {
  mockReset(commentsDaoMock);
  mockReset(accountsDaoMock);
});

describe('Map comment to response', () => {
  test('transforms comment into a response model', () => {
    const user = createUser({ publicName: true });
    const votesOptions = { positiveVotes: 5, negativeVotes: 2 };
    const comment = createFullComment({ user, votesOptions });

    const expected: CommentResponse = {
      id: comment.id,
      postTitle: comment.post.title,
      postId: comment.post.id,
      authorName: comment.user.name,
      authorId: comment.user.id,
      body: comment.body,
      score: votesOptions.positiveVotes - votesOptions.negativeVotes,
      positiveVotes: votesOptions.positiveVotes,
      negativeVotes: votesOptions.negativeVotes,
      totalVotes: votesOptions.positiveVotes + votesOptions.negativeVotes,
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
    commentsDaoMock.getAll.mockResolvedValue([]);

    const expected = { comments: [], cursor: null };
    await expect(commentsService.getAll({ user: 'self' })).resolves.toEqual(expected);
  });

  test('returns array and non-null cursor from last comment', async () => {
    const comments = [createFullComment(), createFullComment()];
    commentsDaoMock.getAll.mockResolvedValue(comments);

    const mappedComments = comments.map((it) => mapToCommentResponse(it));
    const expected = { comments: mappedComments, cursor: comments[1].createdAt };
    await expect(commentsService.getAll({ user: 'self' })).resolves.toEqual(expected);
  });

  test(`filtering user with 'self' is the same as using the current user id`, async () => {
    const params: GetAllParams = { user: 'self' };
    const user = createUser();
    commentsDaoMock.getAll.mockResolvedValue([]);

    await commentsService.getAll(params, user.id);

    const options = captor<GetAllOptions>();
    expect(commentsDaoMock.getAll).toHaveBeenCalledWith(options);
    expect(options.value).toMatchObject({ user: user.id });
  });

  test('author name is hidden based on whether or not user name is public', async () => {
    const user1 = createUser({ publicName: false });
    const user2 = createUser({ publicName: true });
    const comments = [createFullComment({ user: user1 }), createFullComment({ user: user2 })];
    commentsDaoMock.getAll.mockResolvedValue(comments);

    const response = await commentsService.getAll({ post: randomUUID() });
    expect(response.comments[0].authorName).toBeNull();
    expect(response.comments[1].authorName).toEqual(user2.name);
  });

  test('author name is shown if comment is from caller user', async () => {
    const user = createUser({ publicName: false });
    const comments = [createFullComment({ user })];
    commentsDaoMock.getAll.mockResolvedValue(comments);

    const response = await commentsService.getAll({ user: user.id }, user.id);
    expect(response.comments[0].authorName).toEqual(user.name);
  });

  test(`sort order defaults to 'desc' if undefined`, async () => {
    commentsDaoMock.getAll.mockResolvedValue([]);

    await commentsService.getAll({ post: randomUUID() });

    const options = captor<GetAllOptions>();
    expect(commentsDaoMock.getAll).toHaveBeenCalledWith(options);
    expect(options.value.sort).toEqual('desc');
  });

  const takeDefault = 30;
  test(`number of elements to take defaults to ${takeDefault} if not defined`, async () => {
    commentsDaoMock.getAll.mockResolvedValue([]);

    await commentsService.getAll({ post: randomUUID() });

    const options = captor<GetAllOptions>();
    expect(commentsDaoMock.getAll).toHaveBeenCalledWith(options);
    expect(options.value.take).toEqual(takeDefault);
  });

  test(`include = 'all' only includes published comments if no caller is defined`, async () => {
    commentsDaoMock.getAll.mockResolvedValue([]);

    await commentsService.getAll({ post: randomUUID(), include: 'all' });
    await commentsService.getAll({ post: randomUUID() });

    let options = captor<GetAllOptions>();
    expect(commentsDaoMock.getAll).toHaveBeenNthCalledWith(1, options);
    expect(options.value.filterDraft).toEqual(false);
    expect(commentsDaoMock.getAll).toHaveBeenNthCalledWith(2, options);
    expect(options.value.filterDraft).toEqual(false);
  });

  test(`include = 'all' includes published and draft comments if caller is defined`, async () => {
    const user = createUser();
    commentsDaoMock.getAll.mockResolvedValue([]);

    await commentsService.getAll({ post: randomUUID(), include: 'all' }, user.id);
    await commentsService.getAll({ post: randomUUID() }, user.id);

    let options = captor<GetAllOptions>();
    expect(commentsDaoMock.getAll).toHaveBeenNthCalledWith(1, options);
    expect(options.value.filterDraft).toBeUndefined();
    expect(commentsDaoMock.getAll).toHaveBeenNthCalledWith(2, options);
    expect(options.value.filterDraft).toBeUndefined();
  });

  test(`include = 'published' filters comments that are not drafts`, async () => {
    commentsDaoMock.getAll.mockResolvedValue([]);

    await commentsService.getAll({ post: randomUUID(), include: 'published' });

    const options = captor<GetAllOptions>();
    expect(commentsDaoMock.getAll).toHaveBeenCalledWith(options);
    expect(options.value.filterDraft).toEqual(false);
  });

  test(`include = 'drafts' filters comments that are drafts only if caller is defined`, async () => {
    commentsDaoMock.getAll.mockResolvedValue([]);

    await commentsService.getAll({ post: randomUUID(), include: 'drafts' }, randomUUID());

    const options = captor<GetAllOptions>();
    expect(commentsDaoMock.getAll).toHaveBeenCalledWith(options);
    expect(options.value.filterDraft).toEqual(true);
  });

  test(`include = 'drafts' returns early if no caller is defined`, async () => {
    const comments = [createFullComment()];
    commentsDaoMock.getAll.mockResolvedValue(comments);

    const params: GetAllParams = { post: randomUUID(), include: 'drafts' };
    const expected = { comments: [], cursor: null };
    await expect(commentsService.getAll(params)).resolves.toEqual(expected);
  });

  test('skips one item if cursor is defined', async () => {
    commentsDaoMock.getAll.mockResolvedValue([]);

    await commentsService.getAll({ post: randomUUID() });
    await commentsService.getAll({ post: randomUUID(), cursor: new Date() });

    let options = captor<GetAllOptions>();
    expect(commentsDaoMock.getAll).toHaveBeenNthCalledWith(1, options);
    expect(options.value.skip).toEqual(0);

    expect(commentsDaoMock.getAll).toHaveBeenNthCalledWith(2, options);
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

    commentsDaoMock.getAll.mockResolvedValue([]);

    await commentsService.getAll(params);

    const options = captor<GetAllOptions>();
    expect(commentsDaoMock.getAll).toHaveBeenCalledWith(options);
    expect(options.value).toMatchObject(params);
  });
});

describe('Create new comment', () => {
  test('fails if database creation fails (invalid user or post)', async () => {
    const data = createNewCommentData();
    const user = createUser();

    commentsDaoMock.createNewComment.mockRejectedValue(new Error());

    await expect(commentsService.newComment(data, user.id)).rejects
      .toEqual(new NotFoundError('Invalid user or post'));
  });

  test('returns newly created comment on success', async () => {
    const user = createUser({ publicName: false });
    const post = createFullPost({ user });
    const data = createNewCommentData({ postId: post.id });
    const comment = createFullComment({ user, post });

    commentsDaoMock.createNewComment.mockResolvedValue(comment);

    const expected = mapToCommentResponse(comment, user.id);
    await expect(commentsService.newComment(data, user.id)).resolves.toEqual(expected);
    expect(expected.authorName).toEqual(user.name);
  });
});

describe('Get a single comment', () => {
  test(`fails if comment with the provided id doesn't exist`, async () => {
    const commentId = randomUUID();
    commentsDaoMock.findById.mockResolvedValue(null);

    await expect(commentsService.getComment(commentId)).rejects
      .toEqual(new NotFoundError(`Couldn't find comment with id ${commentId}`));
  });

  test(`fails if comment is a draft and caller wasn't defined`, async () => {
    const comment = createFullComment({ draft: true });
    commentsDaoMock.findById.mockResolvedValue(comment);

    await expect(commentsService.getComment(comment.id)).rejects
      .toEqual(new NotFoundError(`Couldn't find comment with id ${comment.id}`));
  });

  test(`fails if comment is a draft and user id doesn't match`, async () => {
    const comment = createFullComment({ draft: true });
    commentsDaoMock.findById.mockResolvedValue(comment);

    await expect(commentsService.getComment(comment.id, randomUUID())).rejects
      .toEqual(new NotFoundError(`Couldn't find comment with id ${comment.id}`));
  });

  test(`returns draft if provided user id matches`, async () => {
    const comment = createFullComment({ draft: true });
    commentsDaoMock.findById.mockResolvedValue(comment);

    const expected = mapToCommentResponse(comment, comment.userId);
    await expect(commentsService.getComment(comment.id, comment.userId)).resolves.toEqual(expected);
  });

  const withUserCases = [[false], [true]];
  test.each(withUserCases)(
    'returns published comment (with user defined: %p)',
    async (withUser) => {
      const user = createUser({ publicName: false });
      const comment = createFullComment({ user });
      commentsDaoMock.findById.mockResolvedValue(comment);

      const userId = withUser ? comment.userId : undefined;
      const expected = mapToCommentResponse(comment, userId);
      await expect(commentsService.getComment(comment.id, userId)).resolves.toEqual(expected);
      if (withUser) {
        expect(expected.authorName).toEqual(user.name);
      } else {
        expect(expected.authorName).toBeNull();
      }
    },
  );
});

describe('Update a comment', () => {
  test('fails if draft = true (comments cannot be turned into drafts)', async () => {
    const comment = createComment();
    const data: PatchCommentData = { draft: true };

    await expect(commentsService.updateComment(comment.id, data, comment.userId)).rejects
      .toEqual(new BadRequestError('Comments cannot be turned into drafts'));
  });

  test('fails with not found if database update fails', async () => {
    const comment = createComment();
    commentsDaoMock.updateComment.mockRejectedValue(new Error());

    await expect(commentsService.updateComment(comment.id, {}, comment.userId)).rejects
      .toEqual(new BadRequestError(`Couldn't find comment with id ${comment.id} to update`));
  });

  test('returns updated comment on success', async () => {
    const user = createUser({ publicName: false });
    const comment = createFullComment({ user, draft: true, body: 'old body' });
    const data: PatchCommentData = { draft: false, body: 'new body' };
    const updated = { ...comment, ...data };
    const expected = mapToCommentResponse(updated, user.id);

    commentsDaoMock.updateComment.mockResolvedValue(updated);

    await expect(commentsService.updateComment(comment.id, data, user.id)).resolves
      .toEqual(expected);

    expect(expected.authorName).toEqual(user.name);
  });
});

describe('Delete a comment', () => {
  test(`fails if comment doesn't exist`, async () => {
    const user = createUser();
    const commentId = randomUUID();

    accountsDaoMock.findById.mockResolvedValue(user);
    commentsDaoMock.deleteComment.mockRejectedValue(new Error());

    await expect(commentsService.deleteComment(commentId, user.id)).rejects
      .toEqual(new NotFoundError(`Couldn't find comment with id ${commentId} to delete`));
  });

  const roleCases: Role[][] = [[Role.user], [Role.moderator], [Role.admin]];
  test.each(roleCases)(`deletes post if it exists (role: %p)`, async (role: Role) => {
    const user = createUser({ role });
    const commentId = randomUUID();

    accountsDaoMock.findById.mockResolvedValue(user);
    commentsDaoMock.deleteComment.mockResolvedValue();

    await commentsService.deleteComment(commentId, user.id);

    const userId = role === 'user' ? user.id : undefined;
    expect(commentsDaoMock.deleteComment).toHaveBeenCalledTimes(1);
    expect(commentsDaoMock.deleteComment).toHaveBeenCalledWith(commentId, userId);
  });
});
