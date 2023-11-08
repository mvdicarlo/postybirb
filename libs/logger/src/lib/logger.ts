import { LogLayer, LoggerType } from 'loglayer';
import { Logger as WinstonLogger } from 'winston';
import { serializeError } from './serializers/serialize-errors';

export type PostyBirbLogger = LogLayer<WinstonLogger>;

let log: PostyBirbLogger;

export function initializeLogger(instance: WinstonLogger): void {
  if (log) return;

  log = new LogLayer({
    logger: {
      instance,
      type: LoggerType.WINSTON,
    },
    error: {
      serializer: serializeError,
    },
  });
}

function initializeTestLogger() {
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  const winston: typeof import('winston') = require('winston');
  const instance = winston.createLogger({
    transports: [new winston.transports.Console()],
  });
  initializeLogger(instance);
}

export function Logger() {
  if (process.env.NODE_ENV === 'test' && !log) {
    initializeTestLogger();
  }

  if (!log) {
    throw new Error('Logger not initialized');
  }
  return log.child();
}
