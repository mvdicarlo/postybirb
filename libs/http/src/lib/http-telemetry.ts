import { trackDependency, trackException } from '@postybirb/logger';

export function trackHttpDependency(
  method: string,
  url: string,
  statusCode: number,
  duration: number,
  success: boolean,
  error?: Error,
): void {
  try {
    if (error) {
      trackException(error, {
        source: 'http-dependency',
        method,
        statusCode: String(statusCode),
      });
    }

    trackDependency({
      name: `${method} ${new URL(url).pathname}`,
      target: url,
      dependencyType: 'HTTP',
      duration,
      success,
      resultCode: statusCode,
      properties: {
        source: 'http-dependency',
        method,
        hasError: error ? 'true' : 'false',
      },
    });
  } catch (trackingError) {
    // eslint-disable-next-line no-console
    console.error('Error tracking HTTP dependency:', trackingError);
  }
}
