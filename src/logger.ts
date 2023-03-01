import winston from 'winston';
import config, { LogLevel, logLevels } from './config';

const colors: Record<LogLevel, string> = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'cyan',
};

winston.addColors(colors);

const colorized = (colorized: boolean) => {
  if (colorized) {
    return winston.format.colorize({ level: true });
  } else {
    return winston.format.uncolorize();
  }
};

const format = (options: { colorized: boolean }) => winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.ms' }),
  colorized(options.colorized),
  winston.format.align(),
  winston.format.printf((info) => {
    return `${info.timestamp} [${info.level}]: ${info.message}`;
  }),
);

const transports = [
  new winston.transports.Console(),
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: format({ colorized: false }),
  }),
  new winston.transports.File({
    filename: 'logs/all.log',
    format: format({ colorized: false }),
  }),
];

const logger = winston.createLogger({
  levels: logLevels,
  level: config.logLevel,
  transports,
  format: format({ colorized: true }),
});

export default logger;
