import { LogLayer, LoggerLibrary, LoggerType } from 'loglayer';
import { Logger as WinstonLogger } from 'winston';
import { serializeError } from './serializers/serialize-errors';

export type PostyBirbLogger = LogLayer<WinstonLogger>;

let log: PostyBirbLogger;

function initializeTestLogger() {
  if (log) return;
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  const winston = require('winston');
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  const instance = winston.createLogger({
    transports: [new winston.transports.Console()],
  });
  log = new LogLayer<WinstonLogger>({
    enabled: false,
    logger: {
      instance: instance as unknown as LoggerLibrary,
      type: LoggerType.WINSTON,
    },
    error: {
      serializer: serializeError,
    },
  });
}

export function initializeLogger(instance: WinstonLogger): void {
  if (log) return;

  log = new LogLayer<WinstonLogger>({
    logger: {
      instance: instance as unknown as LoggerLibrary,
      type: LoggerType.WINSTON,
    },
    error: {
      serializer: serializeError,
    },
  });
}

export function Logger() {
  const isTestEnv = process.env.NODE_ENV === 'test';
  if (isTestEnv) {
    if (!log) {
      initializeTestLogger();
    }
  }

  if (!log) {
    throw new Error('Logger not initialized');
  }
  return log.child();
}
