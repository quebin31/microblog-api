import type { Config } from 'jest';

export default <Config>{
  clearMocks: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  collectCoverageFrom: ['src/**/*.ts'],
  coveragePathIgnorePatterns: [
    '.*\.d\.ts',
    'dist',
    'test',
    'config/.*\.ts',
  ],
  testPathIgnorePatterns: ['<rootDir>/dist'],
  setupFilesAfterEnv: [
    '<rootDir>/src/test/mocks/sendgrid.ts',
  ],
  watchPlugins: [
    require.resolve('jest-watch-typeahead/filename'),
    require.resolve('jest-watch-typeahead/testname'),
  ],
};
