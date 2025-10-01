import * as appInsights from 'applicationinsights';

let client: appInsights.TelemetryClient | null = null;
let isInitialized = false;

export interface AppInsightsConfig {
  connectionString?: string;
  instrumentationKey?: string;
  enabled: boolean;
  cloudRole?: string;
  appVersion?: string;
}

const appInsightsConnectionString =
  process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ||
  '<%APP_INSIGHTS_CONNECTION_STRING%>';

/**
 * Initialize Application Insights
 * Call this once during application startup
 * Subsequent calls will update the cloud role only
 */
export function initializeAppInsights(config: AppInsightsConfig): void {
  // eslint-disable-next-line no-param-reassign
  config.connectionString = appInsightsConnectionString;
  // eslint-disable-next-line no-param-reassign
  config.cloudRole = 'postybirb';
  if (
    !config.enabled ||
    (!config.connectionString && !config.instrumentationKey)
  ) {
    // eslint-disable-next-line no-console
    console.log('Application Insights is disabled or not configured');
    return;
  }

  if (isInitialized && client) {
    return;
  }

  try {
    appInsights
      .setup(config.connectionString || config.instrumentationKey)
      .setAutoDependencyCorrelation(true)
      .setAutoCollectRequests(true)
      .setAutoCollectPerformance(false, false) // Disable extended metrics
      .setAutoCollectExceptions(true)
      .setAutoCollectDependencies(true)
      .setAutoCollectConsole(false) // We'll use Winston transport instead
      .setUseDiskRetryCaching(true)
      .setSendLiveMetrics(false)
      .setDistributedTracingMode(
        appInsights.DistributedTracingModes.AI_AND_W3C,
      );

    // Set cloud role name to distinguish between components
    if (config.cloudRole) {
      appInsights.defaultClient.context.tags[
        appInsights.defaultClient.context.keys.cloudRole
      ] = config.cloudRole;
    }

    // Set application version
    if (config.appVersion) {
      appInsights.defaultClient.context.tags[
        appInsights.defaultClient.context.keys.applicationVersion
      ] = config.appVersion;
    }

    appInsights.start();
    client = appInsights.defaultClient;
    isInitialized = true;

    // eslint-disable-next-line no-console
    console.log(`Application Insights initialized for ${config.cloudRole}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize Application Insights:', error);
  }
}

/**
 * Get the Application Insights client
 */
export function getAppInsightsClient(): appInsights.TelemetryClient | null {
  return client;
}

/**
 * Check if Application Insights is initialized
 */
export function isAppInsightsInitialized(): boolean {
  return isInitialized && client !== null;
}

/**
 * Track a custom event
 */
export function trackEvent(
  name: string,
  properties?: { [key: string]: string },
  measurements?: { [key: string]: number },
): void {
  if (client) {
    client.trackEvent({
      name,
      properties,
      measurements,
    });
  }
}

/**
 * Track an exception
 */
export function trackException(
  error: Error,
  properties?: { [key: string]: string },
): void {
  if (client) {
    client.trackException({
      exception: error,
      properties,
    });
  }
}

/**
 * Track a metric
 */
export function trackMetric(
  name: string,
  value: number,
  properties?: { [key: string]: string },
): void {
  if (client) {
    client.trackMetric({
      name,
      value,
      properties,
    });
  }
}

/**
 * Track a trace/log message
 */
export function trackTrace(
  message: string,
  properties?: { [key: string]: string },
): void {
  if (client) {
    client.trackTrace({
      message,
      properties,
    });
  }
}

/**
 * Flush any pending telemetry
 */
export function flushAppInsights(): Promise<void> {
  return new Promise((resolve) => {
    if (client) {
      client.flush();
      // Give it a moment to flush
      setTimeout(() => resolve(), 100);
    } else {
      resolve();
    }
  });
}
