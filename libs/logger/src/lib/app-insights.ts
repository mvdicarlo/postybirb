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

const appInsightsConnectionString = null;

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
    // For Application Insights SDK v3 (OpenTelemetry-based), we need to set
    // OTEL_RESOURCE_ATTRIBUTES to properly configure cloud role name and instance
    // This must be set BEFORE calling setup()
    const cloudRoleName = config.cloudRole || 'postybirb';
    const cloudRoleInstance = 'postybirb-app';

    // Build the OTEL resource attributes
    // service.name maps to cloud_RoleName
    // service.instance.id maps to cloud_RoleInstance
    const resourceAttributes = [
      `service.name=${cloudRoleName}`,
      `service.instance.id=${cloudRoleInstance}`,
    ];

    if (config.appVersion) {
      resourceAttributes.push(`service.version=${config.appVersion}`);
    }

    // Set the environment variable that OpenTelemetry uses
    process.env.OTEL_RESOURCE_ATTRIBUTES = resourceAttributes.join(',');

    appInsights
      .setup(config.connectionString || config.instrumentationKey)
      .setAutoDependencyCorrelation(false)
      .setAutoCollectRequests(true)
      .setAutoCollectPerformance(false, false) // Disable extended metrics
      .setAutoCollectExceptions(true)
      .setAutoCollectDependencies(false)
      .setAutoCollectConsole(false) // We'll use Winston transport instead
      .setUseDiskRetryCaching(true)
      .setSendLiveMetrics(false)
      .setDistributedTracingMode(
        appInsights.DistributedTracingModes.AI_AND_W3C,
      );

    // Start the Application Insights client
    appInsights.start();
    client = appInsights.defaultClient;
    isInitialized = true;

    // eslint-disable-next-line no-console
    console.log(
      `Application Insights initialized for ${cloudRoleName} (instance: ${cloudRoleInstance})`,
    );
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
 * Track a dependency (HTTP call, database query, etc.)
 * This populates the Application Map and Dependency views in App Insights
 */
export function trackDependency(
  name: string,
  target: string,
  dependencyTypeName: string,
  data: string,
  duration: number,
  success: boolean,
  resultCode?: number,
  properties?: { [key: string]: string },
): void {
  if (client) {
    client.trackDependency({
      name,
      dependencyTypeName,
      target,
      data,
      duration,
      success,
      resultCode,
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
