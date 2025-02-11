import { PostyBirbDirectories } from '@postybirb/fs';
import { initializeLogger, SerializeDevLog } from '@postybirb/logger';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { environment } from './environments/environment';

function createLogger() {
  PostyBirbDirectories.initializeDirectories();
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  const { transports } = winston;

  const transport = new DailyRotateFile({
    filename: 'postybirb-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    dirname: PostyBirbDirectories.LOGS_DIRECTORY,
  });

  const { combine, timestamp, prettyPrint } = winston.format;
  const consoleTransport = new transports.Console();
  const w = winston.createLogger({
    level: environment.production ? 'info' : 'debug',
    format: environment.production
      ? combine(timestamp(), prettyPrint({ colorize: true }))
      : new SerializeDevLog(),
    transports: [consoleTransport, transport],
    rejectionHandlers: [consoleTransport, transport],
    exceptionHandlers: [consoleTransport, transport],
  });
  initializeLogger(w, environment.production);
}

export function startMetrics() {
  createLogger();
}
