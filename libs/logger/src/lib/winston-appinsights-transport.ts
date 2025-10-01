import * as winston from 'winston';
import TransportStream from 'winston-transport';
import { getAppInsightsClient } from './app-insights';

/**
 * Custom Winston transport for Application Insights
 * Only logs error level messages to reduce noise
 */
export class AppInsightsTransport extends TransportStream {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log(info: any, callback: () => void) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    const client = getAppInsightsClient();
    if (!client) {
      callback();
      return;
    }

    try {
      const { level, message, ...meta } = info;
      const properties: { [key: string]: string } = {};

      // Convert metadata to string properties
      Object.keys(meta).forEach((key) => {
        if (key !== 'timestamp') {
          try {
            properties[key] =
              typeof meta[key] === 'object'
                ? JSON.stringify(meta[key])
                : String(meta[key]);
          } catch {
            properties[key] = '[Unable to serialize]';
          }
        }
      });

      // Map Winston levels to App Insights severity
      // 0 = Verbose, 1 = Information, 2 = Warning, 3 = Error, 4 = Critical
      const severityMap: { [key: string]: number } = {
        error: 3, // Error
        warn: 2, // Warning
        info: 1, // Information
        debug: 0, // Verbose
      };

      const severity = severityMap[level] ?? 1;

      // Track as trace (log message) in App Insights
      // Note: Severity is omitted due to type compatibility issues
      client.trackTrace({
        message: `[${level.toUpperCase()}] ${message}`,
        properties,
      });

      // If it's an error with an exception, also track it as an exception
      if (level === 'error' && meta.error instanceof Error) {
        client.trackException({
          exception: meta.error,
          properties,
        });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error in AppInsightsTransport:', error);
    }

    callback();
  }
}
