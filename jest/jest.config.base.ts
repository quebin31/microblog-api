import { JestConfigWithTsJest } from 'ts-jest';

export default <JestConfigWithTsJest>{
  preset: 'ts-jest',
  rootDir: '..',
  roots: ['<rootDir>/src'],
  collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
  coveragePathIgnorePatterns: [
    '<rootDir>/index.ts',
    '.*\.d\.ts',
    'test',
    'integration',
    'config/.*\.ts',
  ],
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
};
