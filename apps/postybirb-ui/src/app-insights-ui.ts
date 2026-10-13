/* eslint-disable lingui/no-unlocalized-strings */
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import {
  filterTelemetryProperties,
  isTelemetryInstallationId,
  sanitizeError,
} from '@postybirb/logger/telemetry-privacy';

let appInsights: ApplicationInsights | null = null;
const appInsightsConnectionString: string | null = null;

export function initializeAppInsightsUI(
  config: { connectionString?: string; enabled?: boolean } = {},
): void {
  const connectionString =
    config.connectionString ?? appInsightsConnectionString;
  if (config.enabled === false || !connectionString || appInsights) return;

  try {
    const installationId = window.electron?.telemetry_installation_id;
    if (!isTelemetryInstallationId(installationId)) {
      throw new Error('UI telemetry installation ID is unavailable or invalid');
    }
    const insights = new ApplicationInsights({
      config: {
        connectionString,
        cookieCfg: { enabled: false },
        disableCookiesUsage: true,
        isStorageUseDisabled: true,
        enableSessionStorageBuffer: false,
        disableUserInitMessage: true,
        enableAutoRouteTracking: false,
        autoTrackPageVisitTime: false,
        disableExceptionTracking: true,
        enableUnhandledPromiseRejectionTracking: false,
        disableFetchTracking: true,
        disableAjaxTracking: true,
        disableCorrelationHeaders: true,
        enableCorsCorrelation: false,
        enableRequestHeaderTracking: false,
        enableResponseHeaderTracking: false,
      },
    });
    insights.addTelemetryInitializer((envelope) => {
      if (envelope.baseType !== 'ExceptionData') return false;

      // Replace SDK context with only the app-managed pseudonymous identity.
      // eslint-disable-next-line no-param-reassign
      envelope.ext = {};
      // eslint-disable-next-line no-param-reassign
      envelope.tags = [
        {
          'ai.cloud.role': 'postybirb-ui',
          'ai.cloud.roleInstance': 'postybirb-ui',
          'ai.application.ver': window.electron?.app_version || 'unknown',
          'ai.location.ip': '0.0.0.0',
          'ai.user.id': installationId,
        },
      ];
      // eslint-disable-next-line no-param-reassign
      envelope.data = {};
      if (envelope.baseData) {
        // eslint-disable-next-line no-param-reassign
        envelope.baseData.properties = filterTelemetryProperties(
          envelope.baseData.properties,
        );
      }
      return true;
    });
    insights.loadAppInsights();
    appInsights = insights;

    window.addEventListener('error', (event: ErrorEvent) => {
      trackUIException(
        event.error instanceof Error ? event.error : new Error(event.message),
        { source: 'window.onerror' },
      );
    });
    window.addEventListener(
      'unhandledrejection',
      (event: PromiseRejectionEvent) => {
        trackUIException(
          event.reason instanceof Error
            ? event.reason
            : new Error(String(event.reason)),
          { source: 'unhandledrejection' },
        );
      },
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to initialize UI Application Insights:', error);
  }
}

export function trackUIException(
  error: Error,
  properties?: Record<string, string>,
): void {
  if (!appInsights) return;

  try {
    appInsights.trackException({
      exception: sanitizeError(error),
      severityLevel: 3,
      properties: filterTelemetryProperties(properties),
    });
  } catch (trackingError) {
    // eslint-disable-next-line no-console
    console.warn('Failed to track UI exception:', trackingError);
  }
}
