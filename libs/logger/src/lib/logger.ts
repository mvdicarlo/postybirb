import * as pinoms from 'pino-multi-stream';
import P, { pino } from 'pino';
import * as rotator from 'file-stream-rotator';
import { PostyBirbDirectories } from '@postybirb/fs';
import { join } from 'path';
import { v4 as uuid } from 'uuid';

let logger: pino.Logger;

export function initialize(): void {
  const isTest = process.env.NODE_ENV === 'Test';
  // @todo better check than always being true
  const isDev = true;

  if (logger) {
    throw new Error('Logger already initialized.');
  }

  const streams: unknown[] = [];
  if (isDev || isTest) {
    streams.push({ stream: pinoms.prettyStream() });
  }

  if (!isTest) {
    streams.push(
      rotator.getStream({
        filename: join(PostyBirbDirectories.LOGS_DIRECTORY, 'pb-%DATE%.log'),
        frequency: '1m',
        verbose: false,
        max_logs: '7d',
        audit_file: join(PostyBirbDirectories.LOGS_DIRECTORY, 'audit.txt'),
        date_format: 'YYYY-MM-DD',
      })
    );
  }

  logger = pinoms({ streams });
}

export function Logger(
  name: string,
  extra?: Record<string, string>
): pino.Logger {
  if (!logger) {
    initialize();
  }

  return logger.child({ module: name, ...extra });
}

process.on('unhandledRejection', (err) => {
  Logger('Process:unhandledRejection').error(err);
});

process.on('uncaughtException', (err) => {
  Logger('Process:uncaughtException').error(err);
});

function processResult(result: unknown) {
  return JSON.parse(
    JSON.stringify(result, (key, value) => {
      if (value instanceof Buffer) {
        return `<Buffer ${value.length}>`;
      }

      if (value instanceof Array && value.length >= 50) {
        return `<Array ${value.length}>`;
      }

      return value;
    })
  );
}

export function Log(level?: P.Level): MethodDecorator {
  const assignedLevel = level ?? 'info';
  return (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) => {
    const l = Logger(target.constructor.name, {
      function: propertyKey,
      logId: uuid(),
    });
    const originalValue = descriptor.value;
    // eslint-disable-next-line no-param-reassign
    descriptor.value = function value(...args: unknown[]) {
      l[level](args);
      try {
        const ret = originalValue.apply(this, args);
        if (ret instanceof Promise) {
          return ret
            .then((result) => {
              if (result) {
                l[assignedLevel](processResult(result));
              }
              return result;
            })
            .catch((err) => {
              l.error(err);
              throw err;
            });
        }

        if (ret) {
          l[assignedLevel](processResult(ret));
        }
        return ret;
      } catch (err) {
        l.error(err);
        throw err;
      }
    };
  };
}
