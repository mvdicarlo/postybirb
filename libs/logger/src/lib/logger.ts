import { LogLayer, LoggerType } from 'loglayer';
import { Logger as WinstonLogger } from 'winston';
import { serializeError } from './serializers/serialize-errors';
import { SerializeDevLog } from './serializers/serialize-dev-log';

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
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  const winston: typeof import('winston') = require('winston');
  const instance = winston.createLogger({
    format: new SerializeDevLog(),
    transports: [new winston.transports.Console()],
  });
  initializeLogger(instance, false);
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
