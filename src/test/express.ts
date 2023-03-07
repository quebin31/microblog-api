import { NextFunction, Request, Response } from 'express';

export function buildReq(partial?: Partial<Request> | object): Request {
  return <Request>{
    ...partial,
  };
}

export function buildRes(partial?: object): Response {
  const res = <Response><unknown>{
    ...partial,
    status: jest.fn(() => res),
    json: jest.fn(() => res),
    sendStatus: jest.fn(() => res),
  };

  return res;
}

export function buildNext(): NextFunction {
  return jest.fn();
}

export function buildExpressParams() {
  return {
    req: buildReq(),
    res: buildRes(),
    next: buildNext(),
  };
}
