import { PostyBirbDirectories } from '@postybirb/fs';
import { LogLayer, LoggerType } from 'loglayer';
import * as winston from 'winston';
import { Logger as WinstonLogger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { SerializeLog } from './serialize-log';
import { AppInsightsTransport } from './winston-appinsights-transport';

export type PostyBirbLogger = LogLayer<WinstonLogger>;

let log: PostyBirbLogger;

export function Logger(prefix?: string): PostyBirbLogger {
  initializeLogger();

  if (prefix) {
    return log.withPrefix(`[${prefix}]`);
  }

  return log.child();
}

export function initializeLogger(): void {
  if (log) return;

  let instance: WinstonLogger;

  if (process.env.NODE_ENV === 'test') {
    instance = winston.createLogger({
      format: new SerializeLog(),
      transports: [
        new winston.transports.Console({ level: 'error', forceConsole: true }),
      ],
    });
  } else {
    const fileTransport = new DailyRotateFile({
      filename: 'postybirb-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.prettyPrint({ colorize: false }),
      ),
      dirname: PostyBirbDirectories.LOGS_DIRECTORY,
    });

    const consoleTransport = new winston.transports.Console({
      format: new SerializeLog(),
    });

    instance = winston.createLogger({
      level: 'debug',
      transports: [consoleTransport, fileTransport],
    });
    instance.add(new AppInsightsTransport({ level: 'error' }));
  }

  log = new LogLayer({
    logger: { instance, type: LoggerType.WINSTON },
  });
}
