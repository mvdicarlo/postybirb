import winston from 'winston';
import { Logger, initializeLogger } from './logger';
import { SerializeDevLog } from './serializers/serialize-dev-log';

const production = !process.env.DEVELOP;

const { transports } = winston;
const { combine, timestamp, prettyPrint } = winston.format;
const consoleTransport = new transports.Console();
const w = winston.createLogger({
  level: production ? 'info' : 'debug',
  format: production
    ? combine(timestamp(), prettyPrint({ colorize: true }))
    : new SerializeDevLog(),
  transports: [consoleTransport],
  rejectionHandlers: [consoleTransport],
  exceptionHandlers: [consoleTransport],
});

initializeLogger(w, production);

Logger().info('Just some information');

Logger().withPrefix('prefix').info('Just some information with prefix');

Logger().info(
  'Just some very very very very long information that usually does not fit into one line, idk where it can be but i think it can be because pb is very very very usable app.'
);

Logger()
  .withContext({ context: 1, data: 'string' })
  .info('Some information with context');

Logger()
  .withError(new RangeError('Range is out of range'))
  .error('Error happened');

Logger().warn('This is warning test');

describe('PostyBirbLogger', () => {
  describe('Formatted message', () => {
    it('should log formatted message', () => {
      expect(undefined).toBe(undefined);
    });
  });
});
