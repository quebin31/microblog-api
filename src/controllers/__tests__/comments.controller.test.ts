import * as controller from '../comments.controller';
import { commentsService } from '../../services/comments.service';
import { MockProxy } from 'jest-mock-extended';
import { GetAllParams, PatchCommentData } from '../../schemas/comments';
import {
  createCommentResponse,
  createCommentsResponse,
  createNewCommentData,
} from '../../test/factories/comments';
import { buildExpressParams, buildReq, buildRes } from '../../test/express';
import { randomUUID } from 'crypto';
import { PutVoteData } from '../../schemas/votes';

jest.mock('../../services/comments.service');

const commentsServiceMock = commentsService as MockProxy<typeof commentsService>;

describe('Get all comments', () => {
  test('responds with 200 OK (with undefined subject)', async () => {
    const query: GetAllParams = { sort: 'asc' };
    const result = createCommentsResponse();
    const req = buildReq({ query });
    const res = buildRes();
    commentsServiceMock.getAll.calledWith(query).mockResolvedValue(result);

    await controller.getAllComments(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  test('responds with 200 OK (with defined subject)', async () => {
    const query: GetAllParams = { sort: 'desc', take: 1 };
    const subject = randomUUID();
    const result = createCommentsResponse();
    const req = buildReq({ subject, query });
    const res = buildRes();
    commentsServiceMock.getAll.calledWith(query, subject).mockResolvedValue(result);

    await controller.getAllComments(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });
});

describe('Create new comment', () => {
  test('fails if subject is not defined', async () => {
    const { req, res } = buildExpressParams();
    await expect(controller.newComment(req, res)).rejects.toBeInstanceOf(Error);
  });

  test('responds with 201 Created with post data', async () => {
    const subject = randomUUID();
    const body = createNewCommentData();
    const result = createCommentResponse();
    const req = buildReq({ subject, body });
    const res = buildRes();
    commentsServiceMock.newComment.calledWith(body, subject).mockResolvedValue(result);

    await controller.newComment(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(result);
  });
});


describe('Get a comment', () => {
  test('responds with 200 OK (with undefined subject)', async () => {
    const result = createCommentResponse();
    const commentId = randomUUID();
    const req = buildReq({ params: { id: commentId } });
    const res = buildRes();
    commentsServiceMock.getComment.calledWith(commentId).mockResolvedValue(result);

    await controller.getComment(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  test('responds with 200 OK (with defined subject)', async () => {
    const result = createCommentResponse();
    const commentId = randomUUID();
    const subject = randomUUID();
    const req = buildReq({ subject, params: { id: commentId } });
    const res = buildRes();
    commentsServiceMock.getComment.calledWith(commentId, subject).mockResolvedValue(result);

    await controller.getComment(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });
});

describe('Patch a comment', () => {
  test('fails if subject is not defined', async () => {
    const req = buildReq({ params: { id: randomUUID() } });
    const res = buildRes();

    await expect(controller.patchComment(req, res)).rejects.toBeInstanceOf(Error);
  });

  test('responds with 200 OK with updated data', async () => {
    const subject = randomUUID();
    const commentId = randomUUID();
    const body: PatchCommentData = { body: 'New body' };
    const result = createCommentResponse();
    const req = buildReq({ subject, body, params: { id: commentId } });
    const res = buildRes();
    commentsServiceMock.updateComment.calledWith(commentId, subject, body).mockResolvedValue(result);

    await controller.patchComment(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });
});

describe('Delete a comment', () => {
  test('fails if subject is not defined', async () => {
    const req = buildReq({ params: { id: randomUUID() } });
    const res = buildRes();

    await expect(controller.deleteComment(req, res)).rejects.toBeInstanceOf(Error);
  });

  test('responds with 204 No Content', async () => {
    const subject = randomUUID();
    const commentId = randomUUID();
    const req = buildReq({ subject, params: { id: commentId } });
    const res = buildRes();

    await controller.deleteComment(req, res);

    expect(commentsServiceMock.deleteComment).toHaveBeenCalledWith(commentId, subject);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalledWith();
  });
});

describe('Put a comment vote', () => {
  test('fails if subject is not defined', async () => {
    const req = buildReq({ params: { id: randomUUID() } });
    const res = buildRes();

    await expect(controller.putVote(req, res)).rejects.toBeInstanceOf(Error);
  });

  test('responds with 204 No Content', async () => {
    const subject = randomUUID();
    const commentId = randomUUID();
    const body: PutVoteData = { positive: true };
    const req = buildReq({ subject, body, params: { id: commentId } });
    const res = buildRes();

    await controller.putVote(req, res);

    expect(commentsServiceMock.putVote).toHaveBeenCalledWith(commentId, subject, body);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalledWith();
  });
});

describe('Delete a comment vote', () => {
  test('fails if subject is not defined', async () => {
    const req = buildReq({ params: { id: randomUUID() } });
    const res = buildRes();

    await expect(controller.deleteVote(req, res)).rejects.toBeInstanceOf(Error);
  });

  test('responds with 204 No Content', async () => {
    const subject = randomUUID();
    const commentId = randomUUID();
    const req = buildReq({ subject, params: { id: commentId } });
    const res = buildRes();

    await controller.deleteVote(req, res);

    expect(commentsServiceMock.deleteVote).toHaveBeenCalledWith(commentId, subject);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalledWith();
  });
});
