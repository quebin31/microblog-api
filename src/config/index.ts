import dotenv from 'dotenv';

dotenv.config();

const nodeEnvValues = ['production', 'development', 'test'] as const;
export type NodeEnv = typeof nodeEnvValues[number];

function isValidNodeEnv(value: unknown): value is NodeEnv {
  return typeof value === 'string' && nodeEnvValues.includes(value as NodeEnv);
}

export interface Config {
  nodeEnv: NodeEnv,
  jwtSecret: string,
}

export type OverridableConfig = Omit<Partial<Config>, 'nodeEnv'>

const nodeEnv = process.env.NODE_ENV || 'development';
if (!isValidNodeEnv(nodeEnv)) {
  throw new Error(`Received invalid value for environment variable NODE_ENV=${nodeEnv}`);
}

let overridableConfig: OverridableConfig;
switch (nodeEnv) {
  case 'production':
    overridableConfig = require('./config.production').default;
    break;
  case 'development':
    overridableConfig = require('./config.development').default;
    break;
  case 'test':
    overridableConfig = require('./config.testing').default;
    break;
}

export default {
  nodeEnv,
  jwtSecret: process.env.JWT_SECRET ?? overridableConfig.jwtSecret!!,
  ...overridableConfig,
} satisfies Config;
