import * as appInsights from 'applicationinsights';
// eslint-disable-next-line import/no-extraneous-dependencies
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

let client: appInsights.TelemetryClient | null = null;
let isInitialized = false;
let diagInitialized = false;

export interface AppInsightsConfig {
  connectionString?: string;
  instrumentationKey?: string;
  enabled: boolean;
  cloudRole?: string;
  appVersion?: string;
}

const appInsightsConnectionString: string | null = null;

/**
 * Initialize Application Insights
 * Call this once during application startup
 * Subsequent calls will update the cloud role only
 */
export function initializeAppInsights(config: AppInsightsConfig): void {
  // eslint-disable-next-line no-param-reassign
  config.connectionString = appInsightsConnectionString ?? undefined;
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
    // Enable OpenTelemetry diagnostic logging to capture SDK initialization errors
    // This helps debug silent failures in the Application Insights SDK v3
    if (!diagInitialized) {
      diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);
      diagInitialized = true;
    }

    // Disable metrics to avoid AzureMonitorMetricExporter initialization issues
    // This is a workaround for a bug in applicationinsights v3.x where the
    // metrics exporter fails to initialize due to version incompatibilities
    // process.env.APPLICATION_INSIGHTS_NO_STANDARD_METRICS = 'true';

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

    // Verify the client is properly initialized
    // The SDK v3 has a bug where _logApi can be undefined if internal init fails
    if (client) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-underscore-dangle
      const clientAny = client as any;
      // eslint-disable-next-line no-underscore-dangle
      if (!clientAny._logApi) {
        // eslint-disable-next-line no-console
        console.error(
          'Application Insights client exists but _logApi is undefined - SDK initialization failed silently',
        );
        /* eslint-disable no-console, no-underscore-dangle */
        console.error('Client internal state:', {
          _isInitialized: clientAny._isInitialized,
          _options: clientAny._options ? 'present' : 'missing',
          hasConfig: !!clientAny.config,
          configConnectionString: clientAny.config?.connectionString
            ? 'present'
            : 'missing',
        });
        /* eslint-enable no-console, no-underscore-dangle */
        // Don't set isInitialized - the client is broken
        client = null;
        return;
      }
    } else {
      // eslint-disable-next-line no-console
      console.error('Application Insights defaultClient is null after start()');
      return;
    }

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
    try {
      client.trackEvent({
        name,
        properties,
        measurements,
      });
    } catch (error) {
      // Telemetry should never break the application
      // eslint-disable-next-line no-console
      console.warn('Failed to track event:', error);
    }
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
    try {
      client.trackException({
        exception: error,
        properties,
      });
    } catch (err) {
      // Telemetry should never break the application
      // eslint-disable-next-line no-console
      console.warn('Failed to track exception:', err);
    }
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
    try {
      client.trackMetric({
        name,
        value,
        properties,
      });
    } catch (error) {
      // Telemetry should never break the application
      // eslint-disable-next-line no-console
      console.warn('Failed to track metric:', error);
    }
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
    try {
      client.trackTrace({
        message,
        properties,
      });
    } catch (error) {
      // Telemetry should never break the application
      // eslint-disable-next-line no-console
      console.warn('Failed to track trace:', error);
    }
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
    try {
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
    } catch (error) {
      // Telemetry should never break the application
      // eslint-disable-next-line no-console
      console.warn('Failed to track dependency:', error);
    }
  }
}

/**
 * Flush any pending telemetry
 */
export function flushAppInsights(): Promise<void> {
  return new Promise((resolve) => {
    if (client) {
      try {
        client.flush();
      } catch (error) {
        // Telemetry should never break the application
        // eslint-disable-next-line no-console
        console.warn('Failed to flush telemetry:', error);
      }
      // Give it a moment to flush
      setTimeout(() => resolve(), 100);
    } else {
      resolve();
    }
  });
}
