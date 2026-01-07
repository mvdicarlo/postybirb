/* eslint-disable lingui/no-unlocalized-strings */
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

let appInsights: ApplicationInsights | null = null;

/**
 * Initialize Application Insights for the React UI
 * Call this once during application startup
 */
export function initializeAppInsightsUI(): void {
  try {
    const appInsightsConnectionString = null;

    if (!appInsightsConnectionString) {
      // App Insights not configured - this is expected in development
      return;
    }

    appInsights = new ApplicationInsights({
      config: {
        connectionString: appInsightsConnectionString,
        enableAutoRouteTracking: true,
        disableFetchTracking: true,
        disableAjaxTracking: true,
        autoTrackPageVisitTime: false,
        enableCorsCorrelation: true,
        enableRequestHeaderTracking: true,
        enableResponseHeaderTracking: true,
      },
    });

    appInsights.loadAppInsights();
    appInsights.addTelemetryInitializer((envelope) => {
      // eslint-disable-next-line no-param-reassign
      envelope.tags = envelope.tags || [];
      // eslint-disable-next-line no-param-reassign
      envelope.tags['ai.cloud.role'] = 'postybirb-ui';
      // eslint-disable-next-line no-param-reassign
      envelope.tags['ai.application.ver'] =
        window.electron?.app_version || 'unknown';
      return true;
    });
    appInsights.trackPageView();

    // Set up global error handler for React
    window.addEventListener('error', (event: ErrorEvent) => {
      trackUIException(event.error, {
        source: 'window.onerror',
        message: event.message,
        filename: event.filename,
        lineno: String(event.lineno),
        colno: String(event.colno),
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener(
      'unhandledrejection',
      (event: PromiseRejectionEvent) => {
        const error =
          event.reason instanceof Error
            ? event.reason
            : new Error(String(event.reason));
        trackUIException(error, {
          source: 'unhandledrejection',
          reason: String(event.reason),
        });
      },
    );
  } catch (error) {
    // Failed to initialize - silently fail
  }
}

/**
 * Track an exception in the UI
 */
export function trackUIException(
  error: Error,
  properties?: { [key: string]: string },
): void {
  if (appInsights) {
    appInsights.trackException({ exception: error, properties });
  }
}

/**
 * Track a custom event in the UI
 */
export function trackUIEvent(
  name: string,
  properties?: { [key: string]: string },
): void {
  if (appInsights) {
    appInsights.trackEvent({ name, properties });
  }
}

/**
 * Track a page view in the UI
 */
export function trackUIPageView(name?: string, uri?: string): void {
  if (appInsights) {
    appInsights.trackPageView({ name, uri });
  }
}

/**
 * Get the Application Insights instance
 */
export function getAppInsightsUI(): ApplicationInsights | null {
  return appInsights;
}
