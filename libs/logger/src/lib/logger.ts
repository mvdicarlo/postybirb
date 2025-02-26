import { PostyBirbDirectories } from '@postybirb/fs';
import { LogLayer, LoggerType } from 'loglayer';
import * as winston from 'winston';
import { Logger as WinstonLogger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { SerializeDevLog } from './serializers/serialize-dev-log';
import { serializeError } from './serializers/serialize-errors';

export { SerializeDevLog };
export type PostyBirbLogger = LogLayer<WinstonLogger>;

let log: PostyBirbLogger;

export function initializeLogger(
  instance: WinstonLogger,
  errorSerialize = true,
): void {
  if (log) return;

  log = new LogLayer({
    logger: {
      instance,
      type: LoggerType.WINSTON,
    },
    error: errorSerialize
      ? {
          serializer: serializeError,
        }
      : undefined,
  });
}

function initializeTestLogger() {
  PostyBirbDirectories.initializeDirectories();

  const transport = new DailyRotateFile({
    filename: 'postybirb-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    dirname: PostyBirbDirectories.LOGS_DIRECTORY,
  });

  const instance = winston.createLogger({
    format: new SerializeDevLog(),
    transports: [new winston.transports.Console(), transport],
  });
  initializeLogger(instance, false);
}

export function Logger(prefix?: string): PostyBirbLogger {
  if (process.env.NODE_ENV === 'test' && !log) {
    initializeTestLogger();
  }

  if (!log) {
    throw new Error('Logger not initialized');
  }
  if (prefix) {
    return log.withPrefix(`[${prefix}]`);
  }
  return log.child();
}
