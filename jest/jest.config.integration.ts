import { JestConfigWithTsJest } from 'ts-jest';
import baseConfig from './jest.config.base';

// noinspection JSUnusedGlobalSymbols
export default <JestConfigWithTsJest>{
  ...baseConfig,
  displayName: 'integration',
  testEnvironment: 'node',
  verbose: true,
  coverageDirectory: '<rootDir>/coverage/integration',
  testMatch: ['**/__tests__/*.itest.ts', '**/*.itest.ts'],
  maxWorkers: 1,
  setupFilesAfterEnv: [
    '<rootDir>/jest/setup-integration.ts',
    '<rootDir>/src/test/mocks/sendgrid.ts',
  ],
};
