import type { Config } from 'jest';

export default <Config>{
  clearMocks: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  collectCoverageFrom: ['src/**/*.ts'],
  coveragePathIgnorePatterns: ['.*\.d\.ts', 'dist'],
  testPathIgnorePatterns: ['<rootDir>/dist'],
  setupFilesAfterEnv: [
    '<rootDir>/src/test/prisma.ts',
    '<rootDir>/src/test/redis.ts',
  ],
  watchPlugins: [
    require.resolve('jest-watch-typeahead/filename'),
    require.resolve('jest-watch-typeahead/testname'),
  ],
};
