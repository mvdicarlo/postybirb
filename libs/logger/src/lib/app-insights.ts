import {
  AzureMonitorExporterOptions,
  AzureMonitorLogExporter,
  AzureMonitorTraceExporter,
} from '@azure/monitor-opentelemetry-exporter';
import {
  Attributes,
  diag,
  DiagConsoleLogger,
  DiagLogLevel,
  ROOT_CONTEXT,
  SpanKind,
  SpanStatusCode,
  Tracer,
} from '@opentelemetry/api';
import {
  SeverityNumber,
  Logger as TelemetryLogger,
} from '@opentelemetry/api-logs';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from '@opentelemetry/sdk-logs';
import {
  BasicTracerProvider,
  BatchSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { getTelemetryInstallationId } from './telemetry-identity';
import {
  anonymizeDependencyTarget,
  filterTelemetryProperties,
  sanitizeError,
  stripLocalPaths,
} from './telemetry-privacy';

let loggerProvider: LoggerProvider | undefined;
let tracerProvider: BasicTracerProvider | undefined;
let logger: TelemetryLogger | undefined;
let tracer: Tracer | undefined;
let diagnosticsInitialized = false;

export interface AppInsightsConfig {
  connectionString?: string;
  enabled: boolean;
  cloudRole?: string;
  appVersion?: string;
}

export interface DependencyTelemetry {
  name: string;
  target: string;
  dependencyType: 'HTTP' | 'Website';
  duration: number;
  success: boolean;
  resultCode?: number;
  properties?: Record<string, string>;
}

const appInsightsConnectionString: string | null = null;

export function initializeAppInsights(config: AppInsightsConfig): void {
  const connectionString =
    config.connectionString?.trim() ||
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING?.trim() ||
    appInsightsConnectionString;

  if (!config.enabled || !connectionString) {
    return;
  }
  if (isAppInsightsInitialized()) {
    return;
  }

  // The exporters otherwise emit their own metrics and resource diagnostics.
  process.env.APPLICATIONINSIGHTS_STATSBEAT_DISABLED = 'true';
  process.env.APPLICATION_INSIGHTS_NO_STATSBEAT = 'true';
  process.env.APPLICATIONINSIGHTS_OPENTELEMETRY_RESOURCE_METRIC_DISABLED =
    'true';
  delete process.env.APPLICATIONINSIGHTS_SDKSTATS_ENABLED_PREVIEW;

  try {
    getTelemetryInstallationId();
    if (!diagnosticsInitialized) {
      diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);
      diagnosticsInitialized = true;
    }
    const resource = resourceFromAttributes({
      'service.name': config.cloudRole ?? 'postybirb',
      'service.instance.id': 'postybirb-app',
      ...(config.appVersion ? { 'service.version': config.appVersion } : {}),
    });
    const exporterOptions: AzureMonitorExporterOptions = {
      connectionString,
      disableOfflineStorage: true,
      additionalPolicies: [
        {
          position: 'perCall',
          policy: {
            name: 'postybirb-telemetry-privacy',
            sendRequest(request, next) {
              request.headers.set('User-Agent', 'PostyBirbTelemetry');
              return next(request);
            },
          },
        },
      ],
    };
    tracerProvider = new BasicTracerProvider({
      resource,
      spanProcessors: [
        new BatchSpanProcessor(new AzureMonitorTraceExporter(exporterOptions), {
          exportTimeoutMillis: 5_000,
        }),
      ],
    });
    loggerProvider = new LoggerProvider({
      resource,
      processors: [
        new BatchLogRecordProcessor(
          new AzureMonitorLogExporter(exporterOptions),
          {
            exportTimeoutMillis: 5_000,
          },
        ),
      ],
    });
    tracer = tracerProvider.getTracer('postybirb');
    logger = loggerProvider.getLogger('postybirb');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize Application Insights:', error);
    shutdownAppInsights().catch((shutdownError) => {
      // eslint-disable-next-line no-console
      console.warn('Failed to clean up Application Insights:', shutdownError);
    });
  }
}

export function isAppInsightsInitialized(): boolean {
  return logger !== undefined && tracer !== undefined;
}

function telemetryAttributes(properties?: Record<string, unknown>): Attributes {
  return {
    ...filterTelemetryProperties(properties),
    'microsoft.client.ip': '0.0.0.0',
    'enduser.pseudo.id': getTelemetryInstallationId(),
  };
}

export function trackException(
  error: Error,
  properties?: Record<string, string>,
): void {
  if (!logger) return;

  try {
    const sanitized = sanitizeError(error);
    logger.emit({
      context: ROOT_CONTEXT,
      severityNumber: SeverityNumber.ERROR,
      severityText: 'ERROR',
      body: sanitized.message,
      attributes: {
        ...telemetryAttributes(properties),
        'exception.type': sanitized.name,
        'exception.message': sanitized.message,
        'exception.stacktrace':
          sanitized.stack || `${sanitized.name}: ${sanitized.message}`,
      },
    });
  } catch (trackingError) {
    // eslint-disable-next-line no-console
    console.warn('Failed to track exception:', trackingError);
  }
}

export function trackErrorLog(
  message: string,
  properties?: Record<string, string>,
): void {
  if (!logger) return;

  try {
    logger.emit({
      context: ROOT_CONTEXT,
      severityNumber: SeverityNumber.ERROR,
      severityText: 'ERROR',
      body: stripLocalPaths(message),
      attributes: telemetryAttributes(properties),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to track error log:', error);
  }
}

export function trackDependency(dependency: DependencyTelemetry): void {
  if (!tracer) return;

  try {
    if (!Number.isFinite(dependency.duration) || dependency.duration < 0) {
      throw new RangeError('Dependency duration must be a non-negative number');
    }
    const target =
      dependency.dependencyType === 'HTTP'
        ? anonymizeDependencyTarget(dependency.target)
        : dependency.target;
    const endTime = Date.now();
    const span = tracer.startSpan(
      dependency.name,
      {
        kind: SpanKind.CLIENT,
        startTime: endTime - dependency.duration,
        attributes: {
          ...telemetryAttributes(dependency.properties),
          dependencyType: dependency.dependencyType,
          'http.request.method':
            dependency.dependencyType === 'HTTP'
              ? dependency.name.split(' ', 1)[0]
              : 'POST',
          'peer.service': target,
          ...(dependency.resultCode
            ? { 'http.response.status_code': dependency.resultCode }
            : {}),
        },
      },
      ROOT_CONTEXT,
    );
    span.setStatus({
      code: dependency.success ? SpanStatusCode.OK : SpanStatusCode.ERROR,
    });
    span.end(endTime);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to track dependency:', error);
  }
}

async function awaitTelemetry(
  operations: Array<Promise<void> | undefined>,
): Promise<void> {
  const results = await Promise.allSettled(operations);
  const failures = results.flatMap((result) =>
    result.status === 'rejected' ? [result.reason] : [],
  );
  if (failures.length > 0) {
    throw new AggregateError(failures, 'Application Insights export failed');
  }
}

export async function flushAppInsights(): Promise<void> {
  await awaitTelemetry([
    loggerProvider?.forceFlush(),
    tracerProvider?.forceFlush(),
  ]);
}

export async function shutdownAppInsights(): Promise<void> {
  const providers = [loggerProvider, tracerProvider];
  logger = undefined;
  tracer = undefined;
  loggerProvider = undefined;
  tracerProvider = undefined;
  await awaitTelemetry(providers.map((provider) => provider?.shutdown()));
}
