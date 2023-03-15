import { clearDatabase } from '../../test/prisma';
import { randomUUID } from 'crypto';
import { insertTestUser } from '../../test/db/accounts';
import { insertTestPost, insertTestPosts } from '../../test/db/posts';
import { createNewCommentData } from '../../test/factories/comments';
import { captor } from 'jest-mock-extended';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { commentsRepository, GetAllOptions } from '../comments.repository';
import { insertTestComment, insertTestComments } from '../../test/db/comments';
import { postsRepository } from '../posts.repository';
import { omit } from '../../utils/types';
import { PatchCommentData } from '../../schemas/comments';
import { PutVoteData } from '../../schemas/votes';
import { CommentVote } from '@prisma/client';

beforeEach(async () => {
  await clearDatabase();
});

describe('Create new comment', () => {
  test(`fails if provided user doesn't exist`, async () => {
    const user = await insertTestUser();
    const post = await insertTestPost(user.id);
    const otherUserId = randomUUID();
    const data = createNewCommentData({ postId: post.id });
    const error = captor<PrismaClientKnownRequestError>();

    await expect(commentsRepository.createNewComment(data, otherUserId)).rejects.toEqual(error);
    expect(error.value.code).toEqual('P2025');
    expect(error.value.meta?.cause).toMatchInlineSnapshot(
      `"No 'User' record(s) (needed to inline the relation on 'Comment' record(s)) was found for a nested connect on one-to-many relation 'CommentToUser'."`,
    );
  });

  test(`fails if provided post doesn't exist`, async () => {
    const user = await insertTestUser();
    const postId = randomUUID();
    const data = createNewCommentData({ postId });
    const error = captor<PrismaClientKnownRequestError>();

    await expect(commentsRepository.createNewComment(data, user.id)).rejects.toEqual(error);
    expect(error.value.code).toEqual('P2025');
    expect(error.value.meta?.cause).toMatchInlineSnapshot(
      `"No 'Post' record(s) (needed to inline the relation on 'Comment' record(s)) was found for a nested connect on one-to-many relation 'CommentToPost'."`,
    );
  });

  test('returns newly created comment with user, post and votes data', async () => {
    const user = await insertTestUser();
    const post = omit(await insertTestPost(user.id), ['user', 'votes']);
    const data = createNewCommentData({ postId: post.id });
    const comment = await commentsRepository.createNewComment(data, user.id);

    expect(comment).toMatchObject({ ...data, post, user, votes: [] });
  });
});

describe('Get a comment', () => {
  test('returns null if no comment exists with the given id', async () => {
    const commentId = randomUUID();

    await expect(commentsRepository.findById(commentId)).resolves.toBeNull();
  });

  test('returns existent comment with post, user and votes data', async () => {
    const user = await insertTestUser();
    const post = await insertTestPost(user.id);
    const comment = await insertTestComment(user.id, post.id);

    await expect(commentsRepository.findById(comment.id)).resolves.toStrictEqual(comment);
  });
});

describe('Get multiple comments', () => {
  test('returns empty array if no comments are found', async () => {
    const options: GetAllOptions = { sort: 'desc', user: randomUUID(), skip: 0, take: 10 };
    await expect(postsRepository.getAll(options)).resolves.toEqual([]);
  });

  test('returns comments including post, user and votes data', async () => {
    const user = await insertTestUser();
    const post = omit(await insertTestPost(user.id), ['user', 'votes']);
    const comments = await insertTestComments(user.id, post.id);

    const options: GetAllOptions = { sort: 'desc', user: user.id, skip: 0, take: comments.length };
    const found = await commentsRepository.getAll(options);

    found.forEach((comment) => {
      expect(comment.user).toStrictEqual(user);
      expect(comment.post).toStrictEqual(post);
      expect(comment.votes).toEqual([]);
    });
  });

  const orderCases: ('desc' | 'asc')[][] = [['desc'], ['asc']];
  test.each(orderCases)('returns comments in %p order', async (order) => {
    const user = await insertTestUser();
    const post = omit(await insertTestPost(user.id), ['user', 'votes']);
    const comments = await insertTestComments(user.id, post.id);
    const expected = order === 'desc' ? comments.reverse() : comments;

    const options: GetAllOptions = { sort: order, user: user.id, skip: 0, take: comments.length };
    await expect(commentsRepository.getAll(options)).resolves.toEqual(expected);
  });

  test('returns less comments if skip is non-zero', async () => {
    const user = await insertTestUser();
    const post = omit(await insertTestPost(user.id), ['user', 'votes']);
    const comments = await insertTestComments(user.id, post.id);
    const expected = comments.slice(1);

    const options: GetAllOptions = { sort: 'asc', user: user.id, skip: 1, take: comments.length };
    await expect(commentsRepository.getAll(options)).resolves.toEqual(expected);
  });

  test('returns less comments if take is smaller', async () => {
    const user = await insertTestUser();
    const post = omit(await insertTestPost(user.id), ['user', 'votes']);
    const comments = await insertTestComments(user.id, post.id);
    const expected = comments.slice(0, comments.length - 2);

    const options: GetAllOptions = {
      sort: 'asc',
      user: user.id,
      skip: 0,
      take: comments.length - 2,
    };

    await expect(commentsRepository.getAll(options)).resolves.toEqual(expected);
  });

  test('returns all comments (included drafts) if filter is undefined', async () => {
    const user = await insertTestUser();
    const post = omit(await insertTestPost(user.id), ['user', 'votes']);
    const comments = await insertTestComments(user.id, post.id, { draft: false });
    const drafts = await insertTestComments(user.id, post.id, { draft: true });
    const expected = [...comments, ...drafts];

    const options: GetAllOptions = { sort: 'asc', user: user.id, skip: 0, take: expected.length };
    await expect(commentsRepository.getAll(options)).resolves.toEqual(expected);
  });

  const draftCases = [[false], [true]];
  test.each(draftCases)('returns comments filtered by draft = %p', async (draft) => {
    const user = await insertTestUser();
    const post = omit(await insertTestPost(user.id), ['user', 'votes']);
    const comments = await insertTestComments(user.id, post.id, { draft: false });
    const drafts = await insertTestComments(user.id, post.id, { draft: true });
    const expected = draft ? drafts : comments;

    const options: GetAllOptions = {
      sort: 'asc',
      user: user.id,
      skip: 0,
      take: expected.length,
      filterDraft: draft,
    };

    await expect(commentsRepository.getAll(options)).resolves.toEqual(expected);
  });

  test('returns comments starting from cursor if defined', async () => {
    const user = await insertTestUser();
    const post = omit(await insertTestPost(user.id), ['user', 'votes']);
    const comments = await insertTestComments(user.id, post.id);
    const cursor = comments[2].createdAt;
    const expected = comments.slice(2);

    const options: GetAllOptions = {
      sort: 'asc',
      skip: 0,
      user: user.id,
      take: comments.length,
      cursor,
    };

    await expect(commentsRepository.getAll(options)).resolves.toEqual(expected);
  });

  test('returns comments filtered by user if defined', async () => {
    const user1 = await insertTestUser();
    const user2 = await insertTestUser();
    const post = await insertTestPost(user1.id);
    const user1Comments = await insertTestComments(user1.id, post.id);
    const user2Comments = await insertTestComments(user2.id, post.id);

    const take = user1Comments.length + user2Comments.length;
    const options: GetAllOptions = { sort: 'asc', skip: 0, user: user2.id, take };
    await expect(commentsRepository.getAll(options)).resolves.toEqual(user2Comments);
  });

  test('returns comments filtered by post if defined', async () => {
    const user = await insertTestUser();
    const [post1, post2] = await insertTestPosts(user.id, { qty: 2 });
    const post1Comments = await insertTestComments(user.id, post1.id);
    const post2Comments = await insertTestComments(user.id, post2.id);

    const take = post1Comments.length + post2Comments.length;
    const options: GetAllOptions = { sort: 'asc', skip: 0, post: post1.id, take };
    await expect(commentsRepository.getAll(options)).resolves.toEqual(post1Comments);
  });

  test('returns comments filtered by user and post if defined', async () => {
    const user1 = await insertTestUser();
    const user2 = await insertTestUser();
    const [post1, post2] = await insertTestPosts(user1.id, { qty: 2 });

    const post1User2Comments = await insertTestComments(user2.id, post1.id);
    await insertTestComments(user1.id, post1.id);
    await insertTestComments(user2.id, post2.id);

    const take = post1User2Comments.length;
    const options: GetAllOptions = {
      sort: 'asc',
      skip: 0,
      post: post1.id,
      user: user2.id,
      take,
    };

    await expect(commentsRepository.getAll(options)).resolves.toEqual(post1User2Comments);
  });
});

describe('Update a comment', () => {
  test(`fails if comment doesn't exist`, async () => {
    const user = await insertTestUser();
    const commentId = randomUUID();
    const error = captor<PrismaClientKnownRequestError>();

    await expect(commentsRepository.updateComment(commentId, user.id, {})).rejects.toEqual(error);
    expect(error.value.code).toEqual('P2025');
    expect(error.value.meta?.cause).toMatchInlineSnapshot(
      `"No 'Comment' record was found for a nested update on relation 'CommentToUser'."`,
    );
  });

  test(`fails if comment doesn't belong to user`, async () => {
    const user1 = await insertTestUser();
    const user2 = await insertTestUser();
    const post = await insertTestPost(user2.id);
    const comment = await insertTestComment(user1.id, post.id);
    const error = captor<PrismaClientKnownRequestError>();

    await expect(commentsRepository.updateComment(comment.id, user2.id, {})).rejects.toEqual(error);
    expect(error.value.code).toEqual('P2025');
    expect(error.value.meta?.cause).toMatchInlineSnapshot(
      `"No 'Comment' record was found for a nested update on relation 'CommentToUser'."`,
    );
  });

  test('returns updated comment with user, post and votes data', async () => {
    const user = await insertTestUser();
    const post = omit(await insertTestPost(user.id), ['user', 'votes']);
    const comment = await insertTestComment(user.id, post.id);
    const data: PatchCommentData = { body: 'New body' };
    const { updatedAt: origUpdatedAt, ...expected } = { ...comment, ...data, post, user };
    const { updatedAt: lastUpdatedAt, ...received } = await commentsRepository.updateComment(
      comment.id,
      user.id,
      data,
    );

    expect(received).toStrictEqual(expected);
    expect(received.votes).toEqual([]);
    expect(received.user).toEqual(user);
    expect(lastUpdatedAt.getMilliseconds()).toBeGreaterThan(origUpdatedAt.getMilliseconds());
  });
});

describe('Delete a comment', () => {
  test(`fails if comment doesn't exist (without user)`, async () => {
    const commentId = randomUUID();
    await expect(commentsRepository.deleteComment(commentId)).rejects.toEqual(new Error());
  });

  test(`fails if comment doesn't belong to the user`, async () => {
    const user = await insertTestUser();
    const post = await insertTestPost(user.id);
    const comment = await insertTestComment(user.id, post.id);
    const otherUserId = randomUUID();

    await expect(commentsRepository.deleteComment(comment.id, otherUserId)).rejects.toEqual(
      new Error(),
    );
    await expect(commentsRepository.findById(comment.id)).resolves.not.toBeNull();
  });

  test('deletes existent comment (without user)', async () => {
    const user = await insertTestUser();
    const post = await insertTestPost(user.id);
    const comment = await insertTestComment(user.id, post.id);

    await commentsRepository.deleteComment(comment.id);
    await expect(commentsRepository.findById(comment.id)).resolves.toBeNull();
  });

  test('deletes existent comment with a given user', async () => {
    const user = await insertTestUser();
    const post = await insertTestPost(user.id);
    const comment = await insertTestComment(user.id, post.id);

    await commentsRepository.deleteComment(comment.id, user.id);
    await expect(commentsRepository.findById(comment.id)).resolves.toBeNull();
  });
});

describe('Create/update a comment vote', () => {
  test(`fails if user doesn't exist`, async () => {
    const user = await insertTestUser();
    const post = await insertTestPost(user.id);
    const comment = await insertTestComment(user.id, post.id);
    const otherUserId = randomUUID();
    const data: PutVoteData = { positive: true };
    const error = captor<PrismaClientKnownRequestError>();

    await expect(commentsRepository.upsertVote(comment.id, otherUserId, data)).rejects.toEqual(
      error,
    );
    expect(error.value.code).toEqual('P2025');
    expect(error.value.meta?.cause).toMatchInlineSnapshot(
      `"No 'User' record(s) (needed to inline the relation on 'CommentVote' record(s)) was found for a nested connect on one-to-many relation 'CommentVoteToUser'."`,
    );
  });

  test(`fails if comment doesn't exist`, async () => {
    const user = await insertTestUser();
    const commentId = randomUUID();
    const data: PutVoteData = { positive: true };
    const error = captor<PrismaClientKnownRequestError>();

    await expect(commentsRepository.upsertVote(commentId, user.id, data)).rejects.toEqual(error);
    expect(error.value.code).toEqual('P2025');
    expect(error.value.meta?.cause).toMatchInlineSnapshot(
      `"No 'Comment' record(s) (needed to inline the relation on 'CommentVote' record(s)) was found for a nested connect on one-to-many relation 'CommentToCommentVote'."`,
    );
  });

  test(`creates comment vote if it doesn't exist yet`, async () => {
    const user = await insertTestUser();
    const post = await insertTestPost(user.id);
    const comment = await insertTestComment(user.id, post.id);
    const data: PutVoteData = { positive: true };

    await commentsRepository.upsertVote(comment.id, user.id, data);
    const updatedComment = await commentsRepository.findById(comment.id);

    const expectedVote: CommentVote = { userId: user.id, commentId: comment.id, ...data };
    expect(updatedComment?.votes.length).toEqual(1);
    expect(updatedComment?.votes.at(0)).toStrictEqual(expectedVote);
  });

  test('updates comment vote if one already exists', async () => {
    const user = await insertTestUser();
    const post = await insertTestPost(user.id);
    const comment = await insertTestComment(user.id, post.id);

    await commentsRepository.upsertVote(comment.id, user.id, { positive: true });
    await commentsRepository.upsertVote(comment.id, user.id, { positive: false });

    const updatedComment = await commentsRepository.findById(comment.id);

    const expectedVote: CommentVote = { userId: user.id, commentId: comment.id, positive: false };
    expect(updatedComment?.votes.length).toEqual(1);
    expect(updatedComment?.votes.at(0)).toStrictEqual(expectedVote);
  });
});

describe('Delete a comment vote', () => {
  test(`fails if comment vote doesn't exist`, async () => {
    const user = await insertTestUser();
    const post = await insertTestPost(user.id);
    const comment = await insertTestComment(user.id, post.id);
    const error = captor<PrismaClientKnownRequestError>();

    await expect(commentsRepository.deleteVote(comment.id, user.id)).rejects.toEqual(error);
    expect(error.value.code).toEqual('P2025');
    expect(error.value.meta?.cause).toMatchInlineSnapshot(`"Record to delete does not exist."`);
  });

  test('deletes existent post vote', async () => {
    const user = await insertTestUser();
    const post = await insertTestPost(user.id);
    const comment = await insertTestComment(user.id, post.id);

    await commentsRepository.upsertVote(comment.id, user.id, { positive: true });
    await commentsRepository.deleteVote(comment.id, user.id);

    const updatedComment = await commentsRepository.findById(comment.id);
    expect(updatedComment?.votes.length).toEqual(0);
  });
});
