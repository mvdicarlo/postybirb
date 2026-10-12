import { Logform } from 'winston';
import TransportStream from 'winston-transport';
import { trackErrorLog, trackException } from './app-insights';
import { filterTelemetryProperties } from './telemetry-privacy';

export class AppInsightsTransport extends TransportStream {
  log(info: Logform.TransformableInfo, callback: () => void): void {
    setImmediate(() => this.emit('logged', info));

    try {
      // Explicit exception reporting can keep its contextual log local.
      if (info.level === 'error' && info.telemetry !== false) {
        const properties = filterTelemetryProperties({
          source: 'winston',
          ...info,
        });
        const error = [info.err, info.error, info.message].find(
          (value): value is Error => value instanceof Error,
        );
        if (error) {
          trackException(error, properties);
        } else {
          trackErrorLog(String(info.message), properties);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        'Failed to forward error log to Application Insights:',
        error,
      );
    } finally {
      callback();
    }
  }
}
