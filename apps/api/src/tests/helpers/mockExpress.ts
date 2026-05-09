import { NextFunction } from 'express';

export function mockRequest(overrides: Record<string, any> = {}): any {
  const req: any = {
    body: {},
    params: {},
    query: {},
    headers: {},
    cookies: {},
    user: undefined,
    userId: undefined,
    ip: '127.0.0.1',
    url: '/test',
    method: 'GET',
    get: jest.fn().mockReturnValue('test-user-agent'),
    ...overrides,
  };
  return req;
}

export function mockResponse(): any {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
  };
  return res;
}

export function mockNext(): NextFunction {
  return jest.fn() as unknown as NextFunction;
}
