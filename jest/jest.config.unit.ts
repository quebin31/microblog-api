import { JestConfigWithTsJest } from 'ts-jest';

// noinspection JSUnusedGlobalSymbols
export default <JestConfigWithTsJest>{
  displayName: 'unit',
  clearMocks: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  rootDir: '..',
  roots: ['<rootDir>/src'],
  collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
  coverageDirectory: '<rootDir>/coverage/unit',
  coveragePathIgnorePatterns: ['.*\.d\.ts', 'test', 'integration', 'config/.*\.ts'],
  testMatch: ['**/__tests__/*.test.ts', '**/*.test.ts'],
  setupFilesAfterEnv: [
    '<rootDir>/src/test/mocks/sendgrid.ts',
  ],
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
};
