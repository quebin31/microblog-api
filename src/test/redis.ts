import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';
import redisClient from '../redis';
import { RedisClientType } from 'redis';

jest.mock('../redis', () => ({
  __esModule: true,
  default: mockDeep<RedisClientType>(),
}));

beforeEach(() => {
  mockReset(redisClientMock);
});

export const redisClientMock = redisClient as unknown as DeepMockProxy<RedisClientType>;
