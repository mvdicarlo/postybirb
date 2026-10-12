import { trackErrorLog, trackException } from './app-insights';
import { AppInsightsTransport } from './winston-appinsights-transport';

jest.mock('./app-insights', () => ({
  trackErrorLog: jest.fn(),
  trackException: jest.fn(),
}));

describe('AppInsightsTransport', () => {
  const transport = new AppInsightsTransport();

  beforeEach(() => jest.clearAllMocks());

  it('recognizes LogLayer errors without serializing arbitrary metadata', () => {
    const error = new Error('Website returned an invalid response');
    const callback = jest.fn();
    transport.log(
      {
        level: 'error',
        message: 'Posting failed',
        err: error,
        accountId: 'private-account',
        options: { title: 'Private title' },
        website: 'bluesky',
      },
      callback,
    );

    expect(trackException).toHaveBeenCalledWith(error, {
      telemetrySchemaVersion: '2',
      source: 'winston',
      level: 'error',
      website: 'bluesky',
    });
    expect(trackErrorLog).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('sends plain error logs with no additional exception', () => {
    const callback = jest.fn();
    transport.log(
      { level: 'error', message: 'Website integration failed' },
      callback,
    );

    expect(trackErrorLog).toHaveBeenCalledWith('Website integration failed', {
      telemetrySchemaVersion: '2',
      source: 'winston',
      level: 'error',
    });
    expect(trackException).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it.each(['info', 'warn', 'debug'])('never sends %s logs', (level) => {
    const callback = jest.fn();
    transport.log({ level, message: 'Local-only diagnostic' }, callback);

    expect(trackErrorLog).not.toHaveBeenCalled();
    expect(trackException).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('keeps explicitly reported exceptions from being sent twice', () => {
    const callback = jest.fn();
    transport.log(
      {
        level: 'error',
        message: 'Manually reported exception',
        err: new Error('Failure'),
        telemetry: false,
      },
      callback,
    );

    expect(trackErrorLog).not.toHaveBeenCalled();
    expect(trackException).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('handles real LogLayer metadata and errors through Winston', () => {
    const instance = createLogger({ transports: [transport] });
    const logger = new LogLayer({
      logger: { instance, type: LoggerType.WINSTON },
    });
    const error = new Error('Integration failed');
    logger
      .withMetadata({ website: 'bluesky', accountId: 'private-account' })
      .withError(error)
      .error('Posting failed');
    expect(trackException).toHaveBeenCalledWith(error, {
      telemetrySchemaVersion: '2',
      source: 'winston',
      level: 'error',
      website: 'bluesky',
    });
    jest.clearAllMocks();
    logger
      .withMetadata({ telemetry: false })
      .withError(error)
      .error('Reported separately');
    expect(trackException).not.toHaveBeenCalled();
    expect(trackErrorLog).not.toHaveBeenCalled();
    instance.close();
  });
});
import { LogLayer, LoggerType } from 'loglayer';
import { createLogger } from 'winston';
