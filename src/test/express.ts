import { Request, Response } from 'express';

export function buildReq(partial?: object): Request {
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
