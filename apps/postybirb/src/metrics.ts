import { initializeLogger, SerializeDevLog } from '@postybirb/logger';
import { environment } from './environments/environment';

function createLogger() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  const winston: typeof import('winston') = require('winston');
  const { transports } = winston;
  const { combine, timestamp, prettyPrint } = winston.format;
  const consoleTransport = new transports.Console();
  const w = winston.createLogger({
    level: environment.production ? 'info' : 'debug',
    format: environment.production
      ? combine(timestamp(), prettyPrint({ colorize: true }))
      : new SerializeDevLog(),
    transports: [consoleTransport],
    rejectionHandlers: [consoleTransport],
    exceptionHandlers: [consoleTransport],
  });
  initializeLogger(w, environment.production);
}

export function startMetrics() {
  createLogger();
}
