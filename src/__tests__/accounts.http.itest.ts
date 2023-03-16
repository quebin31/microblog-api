import request from 'supertest';
import { Server } from 'http';
import { closeTestServer, startTestServer } from '../test/server';
import { createSignUpData } from '../test/factories/accounts';
import validator from 'validator';
import { clearDatabase } from '../test/prisma';
import { clearRedis } from '../test/redis';
import { SignUpData } from '../schemas/accounts';
import { AuthResponse } from '../services/accounts.service';
import { verificationRepository } from '../repositories/verification.repository';
import { sleep } from '../utils/async';
import { signUp, signUpAdmin, verifyUser } from '../test/http/accounts';
import { randomUUID } from 'crypto';
import { Role } from '@prisma/client';

jest.mock('../services/email.service');

let server: Server;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await closeTestServer(server);
});

describe('Sign up', () => {
  afterAll(async () => {
    await clearDatabase();
    await clearRedis();
  });

  test('responds with 400 Bad Request if body is not valid', async () => {
    const response = await request(server)
      .post('/api/v1/accounts/sign-up')
      .accept('application/json')
      .send({ email: 'not-valid', password: '1234', name: undefined })
      .expect(400)
      .expect('Content-Type', /json/);

    expect(response.body).toMatchObject({
      status: 400,
      code: 'bad_request',
      message: 'Invalid input',
    });

    expect(response.body.errors).toMatchInlineSnapshot(`
      [
        {
          "code": "invalid_string",
          "message": "Invalid email",
          "path": [
            "email",
          ],
          "validation": "email",
        },
        {
          "code": "too_small",
          "exact": false,
          "inclusive": true,
          "message": "String must contain at least 8 character(s)",
          "minimum": 8,
          "path": [
            "password",
          ],
          "type": "string",
        },
        {
          "code": "invalid_type",
          "expected": "string",
          "message": "Required",
          "path": [
            "name",
          ],
          "received": "undefined",
        },
      ]
    `);
  });

  test('responds with 200 OK if body is valid', async () => {
    const data = createSignUpData();
    const response = await request(server)
      .post('/api/v1/accounts/sign-up')
      .accept('application/json')
      .send(data)
      .expect(200)
      .expect('Content-Type', /json/);

    expect(validator.isUUID(response.body.id, '4')).toEqual(true);
    expect(validator.isJWT(response.body.accessToken)).toEqual(true);
  });
});

describe('Sign in', () => {
  let signUpData: SignUpData;

  beforeEach(async () => {
    signUpData = createSignUpData({ email: 'me@mail.com' });
    await signUp(server, signUpData);
  });

  afterEach(async () => {
    await clearDatabase();
    await clearRedis();
  });

  test('responds with 400 Bad Request if body is not valid', async () => {
    const response = await request(server)
      .post('/api/v1/accounts/sign-in')
      .accept('application/json')
      .send({ email: 'not-valid', password: 'password' })
      .expect(400)
      .expect('Content-Type', /json/);

    expect(response.body).toMatchObject({
      status: 400,
      code: 'bad_request',
      message: 'Invalid input',
    });

    expect(response.body.errors).toMatchInlineSnapshot(`
      [
        {
          "code": "invalid_string",
          "message": "Invalid email",
          "path": [
            "email",
          ],
          "validation": "email",
        },
      ]
    `);
  });

  test('responds with 404 Not Found if user is not registered', async () => {
    const response = await request(server)
      .post('/api/v1/accounts/sign-in')
      .accept('application/json')
      .send({ email: 'other@mail.com', password: 'pa$$w0rd' })
      .expect(404)
      .expect('Content-Type', /json/);

    expect(response.body).toStrictEqual({
      status: 404,
      code: 'not_found',
      message: 'Invalid email or password',
    });
  });

  test('responds with 404 Not Found if credentials are incorrect', async () => {
    const password = `!${signUpData.password}`;
    const response = await request(server)
      .post('/api/v1/accounts/sign-in')
      .accept('application/json')
      .send({ email: signUpData.email, password })
      .expect(404)
      .expect('Content-Type', /json/);

    expect(response.body).toStrictEqual({
      status: 404,
      code: 'not_found',
      message: 'Invalid email or password',
    });
  });

  test('responds with 200 OK if credentials are valid', async () => {
    const response = await request(server)
      .post('/api/v1/accounts/sign-in')
      .accept('application/json')
      .send({ email: signUpData.email, password: signUpData.password })
      .expect(200)
      .expect('Content-Type', /json/);

    expect(validator.isUUID(response.body.id, '4')).toEqual(true);
    expect(validator.isJWT(response.body.accessToken)).toEqual(true);
  });
});

describe('Verification', () => {
  let authResponse: AuthResponse;

  beforeEach(async () => {
    authResponse = await signUp(server);
    // Wait for verification event to finish
    await sleep(10);
  });

  afterEach(async () => {
    await clearDatabase();
    await clearRedis();
  });

  test('responds with 401 Unauthorized if no access token is provided', async () => {
    const response = await request(server)
      .post('/api/v1/accounts/verify-email')
      .accept('application/json')
      .send({ verificationCode: '123ABC' })
      .expect(401)
      .expect('Content-Type', /json/);

    expect(response.body).toStrictEqual({
      status: 401,
      code: 'unauthorized',
      message: 'Missing bearer access token',
    });
  });

  test('responds with 400 Bad Request if body is not valid', async () => {
    const response = await request(server)
      .post('/api/v1/accounts/verify-email')
      .auth(authResponse.accessToken, { type: 'bearer' })
      .accept('application/json')
      .send({})
      .expect(400)
      .expect('Content-Type', /json/);

    expect(response.body).toMatchObject({
      status: 400,
      code: 'bad_request',
      message: 'Invalid input',
    });

    expect(response.body.errors).toMatchInlineSnapshot(`
      [
        {
          "code": "invalid_type",
          "expected": "string",
          "message": "Required",
          "path": [
            "verificationCode",
          ],
          "received": "undefined",
        },
      ]
    `);
  });

  test('responds with 400 Bad Request if code is not valid', async () => {
    const response = await request(server)
      .post('/api/v1/accounts/verify-email')
      .auth(authResponse.accessToken, { type: 'bearer' })
      .accept('application/json')
      .send({ verificationCode: '' })
      .expect(400)
      .expect('Content-Type', /json/);

    expect(response.body).toStrictEqual({
      status: 400,
      code: 'bad_request',
      message: 'Received invalid verification code',
    });
  });

  test('responds with 204 No Content if code is valid', async () => {
    const verificationCode = await verificationRepository.code.get(authResponse.id);
    await request(server)
      .post('/api/v1/accounts/verify-email')
      .auth(authResponse.accessToken, { type: 'bearer' })
      .send({ verificationCode })
      .expect(204);
  });

  test('responds with 404 Not Found if code is not found', async () => {
    const verificationCode = await verificationRepository.code.get(authResponse.id);

    // Verify the account so code is removed from cache
    await request(server)
      .post('/api/v1/accounts/verify-email')
      .auth(authResponse.accessToken, { type: 'bearer' })
      .send({ verificationCode });

    const response = await request(server)
      .post('/api/v1/accounts/verify-email')
      .auth(authResponse.accessToken, { type: 'bearer' })
      .accept('application/json')
      .send({ verificationCode })
      .expect(404)
      .expect('Content-Type', /json/);

    expect(response.body).toStrictEqual({
      status: 404,
      code: 'not_found',
      message: `Couldn't find an active verification code`,
    });
  });
});

describe('Resend email', () => {
  let authResponse: AuthResponse;

  beforeEach(async () => {
    authResponse = await signUp(server);
    // Wait for verification event to finish
    await sleep(10);
  });

  afterEach(async () => {
    await clearDatabase();
    await clearRedis();
  });

  test('responds with 401 Unauthorized if no access token is provided', async () => {
    const response = await request(server)
      .post('/api/v1/accounts/resend-email')
      .accept('application/json')
      .expect(401)
      .expect('Content-Type', /json/);

    expect(response.body).toStrictEqual({
      status: 401,
      code: 'unauthorized',
      message: 'Missing bearer access token',
    });
  });

  test('responds with 204 No Content on success', async () => {
    const oldCode = await verificationRepository.code.get(authResponse.id);
    await clearRedis();

    await request(server)
      .post('/api/v1/accounts/resend-email')
      .auth(authResponse.accessToken, { type: 'bearer' })
      .expect(204);

    const newCode = await verificationRepository.code.get(authResponse.id);
    expect(newCode).not.toEqual(oldCode);
  });

  test('responds with 429 Too Many Requests on multiple requests', async () => {
    await clearRedis();

    await request(server)
      .post('/api/v1/accounts/resend-email')
      .auth(authResponse.accessToken, { type: 'bearer' })
      .expect(204);

    const response = await request(server)
      .post('/api/v1/accounts/resend-email')
      .auth(authResponse.accessToken, { type: 'bearer' })
      .expect(429)
      .expect('Content-Type', /json/);

    expect(response.body).toStrictEqual({
      status: 429,
      code: 'too_many_requests',
      message: 'Email verifications can only be sent every 60 seconds',
    });
  });
});

describe('Get an account', () => {
  let signUpData = createSignUpData();
  let authResponse: AuthResponse;

  beforeEach(async () => {
    authResponse = await signUp(server, signUpData);
  });

  afterEach(async () => {
    await clearDatabase();
    await clearRedis();
  });

  test(`responds with 404 Not Found if user doesn't exist`, async () => {
    const userId = randomUUID();
    const response = await request(server)
      .get(`/api/v1/accounts/${userId}`)
      .accept('application/json')
      .expect(404)
      .expect('Content-Type', /json/);

    expect(response.body).toStrictEqual({
      status: 404,
      code: 'not_found',
      message: `Couldn't find user with id ${userId}`,
    });
  });

  test('responds with 404 Not Found if user is not verified', async () => {
    const response = await request(server)
      .get(`/api/v1/accounts/${authResponse.id}`)
      .accept('application/json')
      .expect(404)
      .expect('Content-Type', /json/);

    expect(response.body).toStrictEqual({
      status: 404,
      code: 'not_found',
      message: `Couldn't find user with id ${authResponse.id}`,
    });
  });

  test('responds with 200 OK if user is owner (not verified)', async () => {
    const response = await request(server)
      .get(`/api/v1/accounts/${authResponse.id}`)
      .auth(authResponse.accessToken, { type: 'bearer' })
      .accept('application/json')
      .expect(200)
      .expect('Content-Type', /json/);

    const expected = { email: signUpData.email, name: signUpData.name, role: Role.user };
    expect(response.body).toStrictEqual(expected);
  });

  test('responds with 200 OK if user is verified', async () => {
    await verifyUser(server, authResponse.id, authResponse.accessToken);

    const response = await request(server)
      .get(`/api/v1/accounts/${authResponse.id}`)
      .accept('application/json')
      .expect(200)
      .expect('Content-Type', /json/);

    const expected = { email: null, name: signUpData.name, role: Role.user };
    expect(response.body).toStrictEqual(expected);
  });
});

describe('Patch an account', () => {
  let signUpData = createSignUpData();
  let authResponse: AuthResponse;

  beforeEach(async () => {
    authResponse = await signUp(server, signUpData);
  });

  afterEach(async () => {
    await clearDatabase();
    await clearRedis();
  });

  test('responds with 401 Unauthorized if no access token is provided', async () => {
    const response = await request(server)
      .patch(`/api/v1/accounts/${authResponse.id}`)
      .accept('application/json')
      .expect(401)
      .expect('Content-Type', /json/);

    expect(response.body).toStrictEqual({
      status: 401,
      code: 'unauthorized',
      message: 'Missing bearer access token',
    });
  });

  test('responds with 400 Bad Request if body is not valid', async () => {
    const response = await request(server)
      .patch(`/api/v1/accounts/${authResponse.id}`)
      .auth(authResponse.accessToken, { type: 'bearer' })
      .accept('application/json')
      .send({ name: 'A', publicEmail: 'true' })
      .expect(400)
      .expect('Content-Type', /json/);

    expect(response.body).toMatchObject({
      status: 400,
      code: 'bad_request',
      message: 'Invalid input',
    });

    expect(response.body.errors).toMatchInlineSnapshot(`
      [
        {
          "code": "invalid_union",
          "message": "Invalid input",
          "path": [],
          "unionErrors": [
            {
              "issues": [
                {
                  "code": "too_small",
                  "exact": false,
                  "inclusive": true,
                  "message": "String must contain at least 2 character(s)",
                  "minimum": 2,
                  "path": [
                    "name",
                  ],
                  "type": "string",
                },
                {
                  "code": "invalid_type",
                  "expected": "boolean",
                  "message": "Expected boolean, received string",
                  "path": [
                    "publicEmail",
                  ],
                  "received": "string",
                },
              ],
              "name": "ZodError",
            },
            {
              "issues": [
                {
                  "code": "invalid_type",
                  "expected": "'user' | 'moderator'",
                  "message": "Required",
                  "path": [
                    "role",
                  ],
                  "received": "undefined",
                },
              ],
              "name": "ZodError",
            },
          ],
        },
      ]
    `);
  });

  test('responds with 400 Bad Request if role key is invalid in body', async () => {
    const response = await request(server)
      .patch(`/api/v1/accounts/${authResponse.id}`)
      .auth(authResponse.accessToken, { type: 'bearer' })
      .accept('application/json')
      .send({ role: 'admin' })
      .expect(400)
      .expect('Content-Type', /json/);

    expect(response.body).toMatchObject({
      status: 400,
      code: 'bad_request',
      message: 'Invalid input',
    });

    expect(response.body.errors).toMatchInlineSnapshot(`
      [
        {
          "code": "custom",
          "message": "At least one of 'user', 'publicEmail' or 'publicName' must be defined",
          "path": [],
        },
      ]
    `);
  });

  test('responds with 403 Forbidden if normal user tries to change its role', async () => {
    const response = await request(server)
      .patch(`/api/v1/accounts/${authResponse.id}`)
      .auth(authResponse.accessToken, { type: 'bearer' })
      .accept('application/json')
      .send({ role: 'moderator' })
      .expect(403)
      .expect('Content-Type', /json/);

    expect(response.body).toStrictEqual({
      status: 403,
      code: 'forbidden',
      message: 'Only admins can change roles',
    });
  });

  test('responds with 200 OK on successful information update', async () => {
    const response = await request(server)
      .patch(`/api/v1/accounts/${authResponse.id}`)
      .auth(authResponse.accessToken, { type: 'bearer' })
      .accept('application/json')
      .send({ name: 'New name' })
      .expect(200)
      .expect('Content-Type', /json/);

    const expected = { email: signUpData.email, name: 'New name', role: Role.user };
    expect(response.body).toStrictEqual(expected);
  });

  test('responds with 200 OK on successful role change', async () => {
    const authAdminResponse = await signUpAdmin(server);

    const response = await request(server)
      .patch(`/api/v1/accounts/${authResponse.id}`)
      .auth(authAdminResponse.accessToken, { type: 'bearer' })
      .accept('application/json')
      .send({ role: Role.moderator })
      .expect(200)
      .expect('Content-Type', /json/);

    const expected = { email: null, name: signUpData.name, role: Role.moderator };
    expect(response.body).toStrictEqual(expected);
  });
});
