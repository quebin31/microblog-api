import { JestConfigWithTsJest } from 'ts-jest';
import baseConfig from './jest.config.base';

// noinspection JSUnusedGlobalSymbols
export default <JestConfigWithTsJest>{
  ...baseConfig,
  displayName: 'unit',
  clearMocks: true,
  testEnvironment: 'node',
  verbose: true,
  coverageDirectory: '<rootDir>/coverage/unit',
  testMatch: ['**/__tests__/*.test.ts', '**/*.test.ts'],
  setupFilesAfterEnv: [
    '<rootDir>/src/test/mocks/sendgrid.ts',
  ],
};
