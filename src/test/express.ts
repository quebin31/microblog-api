import { NextFunction, Request, Response } from 'express';
import { mock } from 'jest-mock-extended';

export function buildReq(partial?: Partial<Request> | object): Request {
  return <Request>{
    ...mock<Request>(),
    ...partial,
  };
}

export function buildRes(partial?: Partial<Response> | object): Response {
  const res = <Response>{
    ...mock<Response>(),
    status: jest.fn(() => res),
    json: jest.fn(() => res),
    send: jest.fn(() => res),
    sendStatus: jest.fn(() => res),
    ...partial,
  };

  return res;
}

export function buildNext(): NextFunction {
  return jest.fn();
}

export function buildExpressParams() {
  return { req: buildReq(), res: buildRes(), next: buildNext() };
}
