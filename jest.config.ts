import type { Config } from 'jest';

export default <Config>{
  clearMocks: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  collectCoverageFrom: ['**/*.ts'],
  coveragePathIgnorePatterns: ['**/__test__/*', '**/*.test.*'],
  watchPlugins: [
    require.resolve('jest-watch-typeahead/filename'),
    require.resolve('jest-watch-typeahead/testname'),
  ],
};
