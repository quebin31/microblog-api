import { JestConfigWithTsJest } from 'ts-jest';

// noinspection JSUnusedGlobalSymbols
export default <JestConfigWithTsJest>{
  collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
  coverageDirectory: '<rootDir>/coverage/combined',
  maxWorkers: 1,
  projects: [
    '<rootDir>/jest/jest.config.unit.ts',
    '<rootDir>/jest/jest.config.integration.ts',
  ],
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
};
