import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import { requireDefined } from '../utils/types';

const nodeEnvValues = ['production', 'development', 'test'] as const;
export type NodeEnv = typeof nodeEnvValues[number];

export const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

export type LogLevel = keyof typeof logLevels;

function isValidNodeEnv(value: unknown): value is NodeEnv {
  return typeof value === 'string' && nodeEnvValues.includes(value as NodeEnv);
}

export interface Config {
  nodeEnv: NodeEnv,
  jwtSecret: string,
  port: string,
  logLevel: LogLevel,
  redisUrl: string,
  emailApiKey: string,
}

export type OverridableConfig = Omit<Partial<Config>, 'nodeEnv'>

const nodeEnv = process.env.NODE_ENV ?? 'development';
if (!isValidNodeEnv(nodeEnv)) {
  throw new Error(`Received invalid value for environment variable NODE_ENV=${nodeEnv}`);
}

const env = dotenv.config({ path: `.env.${nodeEnv}` });
dotenvExpand.expand(env);

let overrideConfig: OverridableConfig;
switch (nodeEnv) {
  case 'production':
    overrideConfig = require('./config.production').default;
    break;
  case 'development':
    overrideConfig = require('./config.development').default;
    break;
  case 'test':
    overrideConfig = require('./config.testing').default;
    break;
}

export default <Config>{
  nodeEnv,
  jwtSecret: process.env.JWT_SECRET ?? requireDefined(overrideConfig.jwtSecret),
  port: process.env.PORT ?? requireDefined(overrideConfig.port),
  logLevel: 'debug',
  redisUrl: process.env.REDIS_URL ?? requireDefined(overrideConfig.redisUrl),
  emailApiKey: process.env.EMAIL_API_KEY ?? requireDefined(overrideConfig.emailApiKey),
  ...overrideConfig,
};
