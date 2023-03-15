import * as controller from '../posts.controller';
import { postsService } from '../../services/posts.service';
import { MockProxy } from 'jest-mock-extended';
import { buildExpressParams, buildReq, buildRes } from '../../test/express';
import { GetAllParams, PatchPostData } from '../../schemas/posts';
import { randomUUID } from 'crypto';
import { PutVoteData } from '../../schemas/votes';
import {
  createNewPostData,
  createPostResponse,
  createPostsResponse,
} from '../../test/factories/posts';

jest.mock('../../services/posts.service');

const postsServiceMock = postsService as MockProxy<typeof postsService>;

describe('Get all posts', () => {
  test('responds with 200 OK with undefined subject', async () => {
    const query: GetAllParams = { sort: 'desc' };
    const result = createPostsResponse();
    const req = buildReq({ query });
    const res = buildRes();
    postsServiceMock.getAll.calledWith(query).mockResolvedValue(result);

    await controller.getAllPosts(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  test('responds with 200 OK with defined subject', async () => {
    const query: GetAllParams = { sort: 'asc', take: 2 };
    const subject = randomUUID();
    const result = createPostsResponse();
    const req = buildReq({ subject, query });
    const res = buildRes();
    postsServiceMock.getAll.calledWith(query, subject).mockResolvedValue(result);

    await controller.getAllPosts(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });
});

describe('Create new post', () => {
  test('fails if subject is not defined', async () => {
    const { req, res } = buildExpressParams();
    await expect(controller.newPost(req, res)).rejects.toBeInstanceOf(Error);
  });

  test('responds with 201 Created with post data', async () => {
    const subject = randomUUID();
    const body = createNewPostData();
    const result = createPostResponse();
    const req = buildReq({ subject, body });
    const res = buildRes();
    postsServiceMock.newPost.calledWith(body, subject).mockResolvedValue(result);

    await controller.newPost(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(result);
  });
});

describe('Get a post', () => {
  test('responds with 200 OK with undefined subject', async () => {
    const result = createPostResponse();
    const postId = randomUUID();
    const req = buildReq({ params: { id: postId } });
    const res = buildRes();
    postsServiceMock.getPost.calledWith(postId).mockResolvedValue(result);

    await controller.getPost(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  test('responds with 200 OK with defined subject', async () => {
    const result = createPostResponse();
    const postId = randomUUID();
    const subject = randomUUID();
    const req = buildReq({ subject, params: { id: postId } });
    const res = buildRes();
    postsServiceMock.getPost.calledWith(postId, subject).mockResolvedValue(result);

    await controller.getPost(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });
});

describe('Patch a post', () => {
  test('fails if subject is not defined', async () => {
    const req = buildReq({ params: { id: randomUUID() } });
    const res = buildRes();

    await expect(controller.patchPost(req, res)).rejects.toBeInstanceOf(Error);
  });

  test('responds with 200 OK with updated data', async () => {
    const subject = randomUUID();
    const postId = randomUUID();
    const body: PatchPostData = { body: 'New body' };
    const result = createPostResponse();
    const req = buildReq({ subject, body, params: { id: postId } });
    const res = buildRes();
    postsServiceMock.updatePost.calledWith(postId, subject, body).mockResolvedValue(result);

    await controller.patchPost(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });
});

describe('Delete a post', () => {
  test('fails if subject is not defined', async () => {
    const req = buildReq({ params: { id: randomUUID() } });
    const res = buildRes();

    await expect(controller.deletePost(req, res)).rejects.toBeInstanceOf(Error);
  });

  test('responds with 204 No Content', async () => {
    const subject = randomUUID();
    const postId = randomUUID();
    const req = buildReq({ subject, params: { id: postId } });
    const res = buildRes();

    await controller.deletePost(req, res);

    expect(postsServiceMock.deletePost).toHaveBeenCalledWith(postId, subject);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalledWith();
  });
});

describe('Put a post vote', () => {
  test('fails if subject is not defined', async () => {
    const req = buildReq({ params: { id: randomUUID() } });
    const res = buildRes();

    await expect(controller.putVote(req, res)).rejects.toBeInstanceOf(Error);
  });

  test('responds with 204 No Content', async () => {
    const subject = randomUUID();
    const postId = randomUUID();
    const body: PutVoteData = { positive: true };
    const req = buildReq({ subject, body, params: { id: postId } });
    const res = buildRes();

    await controller.putVote(req, res);

    expect(postsServiceMock.putVote).toHaveBeenCalledWith(postId, subject, body);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalledWith();
  });
});

describe('Delete a post vote', () => {
  test('fails if subject is not defined', async () => {
    const req = buildReq({ params: { id: randomUUID() } });
    const res = buildRes();

    await expect(controller.deleteVote(req, res)).rejects.toBeInstanceOf(Error);
  });

  test('responds with 204 No Content', async () => {
    const subject = randomUUID();
    const postId = randomUUID();
    const req = buildReq({ subject, params: { id: postId } });
    const res = buildRes();

    await controller.deleteVote(req, res);

    expect(postsServiceMock.deleteVote).toHaveBeenCalledWith(postId, subject);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalledWith();
  });
});
