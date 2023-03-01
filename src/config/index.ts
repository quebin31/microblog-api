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
  port: string,
}

export type OverridableConfig = Omit<Partial<Config>, 'nodeEnv'>

const nodeEnv = process.env.NODE_ENV || 'development';
if (!isValidNodeEnv(nodeEnv)) {
  throw new Error(`Received invalid value for environment variable NODE_ENV=${nodeEnv}`);
}

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
  jwtSecret: process.env.JWT_SECRET ?? overrideConfig.jwtSecret!!,
  port: process.env.PORT ?? overrideConfig.port!!,
  ...overrideConfig,
};
