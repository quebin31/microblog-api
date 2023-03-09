import { JestConfigWithTsJest } from 'ts-jest';

// noinspection JSUnusedGlobalSymbols
export default <JestConfigWithTsJest>{
  displayName: 'integration',
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  rootDir: '..',
  roots: ['<rootDir>/src'],
  collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
  coverageDirectory: '<rootDir>/coverage/integration',
  coveragePathIgnorePatterns: ['.*\.d\.ts', 'test', 'integration', 'config/.*\.ts'],
  testMatch: ['**/__tests__/*.integration.ts', '**/*.integration.ts'],
  maxConcurrency: 1,
  setupFilesAfterEnv: [
    '<rootDir>/jest/setup-integration.ts',
  ],
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
};
