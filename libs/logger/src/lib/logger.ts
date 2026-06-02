import { PostyBirbDirectories } from '@postybirb/fs';
import { LogLayer, LoggerType } from 'loglayer';
import * as winston from 'winston';
import { Logger as WinstonLogger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { SerializeLog } from './serialize-log';
import { AppInsightsTransport } from './winston-appinsights-transport';

// Offical loglayer types do not support arbitrary types in messages. Our formatter (./serialize-log.ts) does supports them
// Also PostyBirbLogger strips unused methods such as enablePlugin/disablePlugin/mute/unmute from types

type LogLayerLogger = LogLayer<WinstonLogger>;

type MessageDataType = unknown;

export interface PostyBirbLogger {
  /**
   * Sends a log message to the logging library under an info log level.
   */
  info(...messages: MessageDataType[]): void;
  /**
   * Sends a log message to the logging library under the warn log level
   */
  warn(...messages: MessageDataType[]): void;
  /**
   * Sends a log message to the logging library under the error log level
   *
   */
  error(...messages: MessageDataType[]): void;
  /**
   * Sends a log message to the logging library under the debug log level
   */
  debug(...messages: MessageDataType[]): void;
  /**
   * Sends a log message to the logging library under the trace log level
   */
  trace(...messages: MessageDataType[]): void;
  /**
   * Sends a log message to the logging library under the fatal log level
   */
  fatal(...messages: MessageDataType[]): void;

  /**
   * Specifies metadata to include with the log message
   */
  withMetadata(metadata: unknown): PostyBirbLogger;
  /**
   * Specifies an Error to include with the log message
   */
  withError(error: unknown): PostyBirbLogger;

  /**
   * Appends context data which will be included with
   * every log entry.
   */
  withContext(context: Record<string, unknown>): PostyBirbLogger;
}

let log: LogLayerLogger;

export function Logger(prefix?: string): PostyBirbLogger {
  initializeLogger();

  if (prefix) {
    return log.withPrefix(`[${prefix}]`) as unknown as PostyBirbLogger;
  }

  return log.child() as unknown as PostyBirbLogger;
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
      zippedArchive: false,
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.combine(
        new SerializeLog(),
        winston.format.uncolorize(),
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
