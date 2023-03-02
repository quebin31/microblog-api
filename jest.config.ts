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
    '<rootDir>/src/test/mocks/prisma.ts',
    '<rootDir>/src/test/mocks/redis.ts',
    '<rootDir>/src/test/mocks/sendgrid.ts',
  ],
  watchPlugins: [
    require.resolve('jest-watch-typeahead/filename'),
    require.resolve('jest-watch-typeahead/testname'),
  ],
};
