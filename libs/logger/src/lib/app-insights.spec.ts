import {
  AzureMonitorExporterOptions,
  AzureMonitorLogExporter,
  AzureMonitorTraceExporter,
} from '@azure/monitor-opentelemetry-exporter';
import { LoggerProvider } from '@opentelemetry/sdk-logs';
import { BasicTracerProvider } from '@opentelemetry/sdk-trace-base';
import {
  flushAppInsights,
  initializeAppInsights,
  isAppInsightsInitialized,
  shutdownAppInsights,
  trackDependency,
  trackErrorLog,
  trackException,
} from './app-insights';

const mockInstallationId = '7edb828d-387a-4e61-9f7c-f2fd4c7a12bb';
jest.mock('./telemetry-identity', () => ({
  getTelemetryInstallationId: jest.fn(() => mockInstallationId),
}));

interface TelemetryEnvelope {
  name: string;
  time: string;
  sampleRate: number;
  tags: Record<string, string>;
  data: {
    baseType: string;
    baseData: {
      name?: string;
      target?: string;
      type?: string;
      data?: string;
      resultCode?: string;
      duration?: string;
      success?: boolean;
      message?: string;
      severityLevel?: string;
      exceptions?: Array<{ typeName: string; message: string; stack: string }>;
      properties: Record<string, string>;
    };
  };
}

const mockEnvelopes: TelemetryEnvelope[] = [];
const mockHttpClient: NonNullable<AzureMonitorExporterOptions['httpClient']> = {
  sendRequest: jest.fn(async (request) => {
    const envelopes: TelemetryEnvelope[] = JSON.parse(String(request.body));
    mockEnvelopes.push(...envelopes);
    return {
      request,
      status: 200,
      headers: request.headers,
      bodyAsText: JSON.stringify({
        itemsReceived: envelopes.length,
        itemsAccepted: envelopes.length,
        errors: [],
      }),
    };
  }),
};

// Exercise the real SDK serialization, intercepting only its HTTP transport.
jest.mock('@azure/monitor-opentelemetry-exporter', () => {
  const actual = jest.requireActual<
    typeof import('@azure/monitor-opentelemetry-exporter')
  >('@azure/monitor-opentelemetry-exporter');
  return {
    ...actual,
    AzureMonitorLogExporter: jest.fn(
      (options: AzureMonitorExporterOptions) =>
        new actual.AzureMonitorLogExporter({
          ...options,
          httpClient: mockHttpClient,
          retryOptions: { maxRetries: 0 },
        }),
    ),
    AzureMonitorTraceExporter: jest.fn(
      (options: AzureMonitorExporterOptions) =>
        new actual.AzureMonitorTraceExporter({
          ...options,
          httpClient: mockHttpClient,
          retryOptions: { maxRetries: 0 },
        }),
    ),
  };
});

const connectionString =
  'InstrumentationKey=00000000-0000-0000-0000-000000000000;IngestionEndpoint=https://example.invalid/';
const environmentNames = [
  'APPLICATIONINSIGHTS_CONNECTION_STRING',
  'OTEL_RESOURCE_ATTRIBUTES',
  'APPLICATIONINSIGHTS_STATSBEAT_DISABLED',
  'APPLICATION_INSIGHTS_NO_STATSBEAT',
  'APPLICATIONINSIGHTS_OPENTELEMETRY_RESOURCE_METRIC_DISABLED',
  'APPLICATIONINSIGHTS_SDKSTATS_ENABLED_PREVIEW',
] as const;
const originalEnvironment = Object.fromEntries(
  environmentNames.map((name) => [name, process.env[name]]),
);

describe('manual Application Insights pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnvelopes.length = 0;
    delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
    process.env.OTEL_RESOURCE_ATTRIBUTES =
      'host.name=alice-pc,os.type=Windows,service.instance.id=private-device';
    process.env.APPLICATIONINSIGHTS_SDKSTATS_ENABLED_PREVIEW = 'true';
  });

  afterEach(async () => {
    await shutdownAppInsights();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    environmentNames.forEach((name) => {
      const value = originalEnvironment[name];
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    });
  });

  function initialize(): void {
    initializeAppInsights({
      enabled: true,
      connectionString,
      appVersion: '4.1.1',
    });
  }

  it('does not initialize or send anything when disabled', async () => {
    initializeAppInsights({ enabled: false, connectionString });
    trackException(new Error('Local-only error'));
    trackErrorLog('Local-only log');
    await flushAppInsights();

    expect(isAppInsightsInitialized()).toBe(false);
    expect(AzureMonitorLogExporter).not.toHaveBeenCalled();
    expect(AzureMonitorTraceExporter).not.toHaveBeenCalled();
    expect(mockHttpClient.sendRequest).not.toHaveBeenCalled();
  });

  it('respects runtime configuration without modifying the caller or environment resources', () => {
    const config = Object.freeze({
      enabled: true,
      connectionString,
      cloudRole: 'postybirb',
      appVersion: '4.1.1',
    });
    initializeAppInsights(config);
    initializeAppInsights(config);

    expect(isAppInsightsInitialized()).toBe(true);
    expect(AzureMonitorLogExporter).toHaveBeenCalledTimes(1);
    expect(AzureMonitorTraceExporter).toHaveBeenCalledTimes(1);
    expect(AzureMonitorLogExporter).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionString,
        disableOfflineStorage: true,
      }),
    );
    expect(process.env.OTEL_RESOURCE_ATTRIBUTES).toContain('alice-pc');
  });

  it('supports a runtime connection string', () => {
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = connectionString;
    initializeAppInsights({ enabled: true });
    expect(isAppInsightsInitialized()).toBe(true);
  });

  it('exports useful exceptions without account metadata or local paths', async () => {
    initialize();
    const error = new TypeError(
      "Cannot open 'C:\\Users\\alice\\Pictures\\private.png'",
    );
    error.stack = `${error.name}: ${error.message}\n    at upload (C:\\Users\\alice\\app.asar\\main.js:10:4)`;
    trackException(error, {
      source: 'posting',
      website: 'bluesky',
      accountId: 'private-account',
      submissionId: 'private-submission',
      options: 'private-options',
    });
    await flushAppInsights();

    expect(mockEnvelopes).toHaveLength(1);
    const envelope = mockEnvelopes[0];
    expect(envelope.data.baseType).toBe('ExceptionData');
    expect(envelope.data.baseData.exceptions).toEqual([
      {
        typeName: 'TypeError',
        message: "Cannot open '[local-path]'",
        hasFullStack: true,
        stack:
          "TypeError: Cannot open '[local-path]'\n    at upload (main.js:10:4)",
      },
    ]);
    expect(envelope.tags).toMatchObject({
      'ai.cloud.role': 'postybirb',
      'ai.cloud.roleInstance': 'postybirb-app',
      'ai.application.ver': '4.1.1',
      'ai.location.ip': '0.0.0.0',
    });
    expect(envelope.data.baseData.properties).toMatchObject({
      source: 'posting',
      website: 'bluesky',
      telemetrySchemaVersion: '2',
    });
    const serialized = JSON.stringify(envelope);
    expect(
      jest
        .mocked(mockHttpClient.sendRequest)
        .mock.calls[0][0].headers.get('User-Agent'),
    ).toBe('PostyBirbTelemetry');
    [
      'alice',
      'private-account',
      'private-submission',
      'private-options',
      'host.name',
      'os.type',
      'ai.user.authUserId',
      'ai.session',
    ].forEach((value) => expect(serialized).not.toContain(value));
    expect(error.message).toContain('alice');
  });

  it('exports measured HTTP dependencies with endpoint paths but without URL queries or credentials', async () => {
    const exportSpans = jest.spyOn(
      jest.requireActual<
        typeof import('@azure/monitor-opentelemetry-exporter')
      >('@azure/monitor-opentelemetry-exporter').AzureMonitorTraceExporter
        .prototype,
      'export',
    );
    initialize();
    const now = 1_700_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    trackDependency({
      name: 'POST /users/alice',
      target: 'https://alice:secret@api.example.com/users/alice?token=secret',
      dependencyType: 'HTTP',
      duration: 1234,
      success: false,
      resultCode: 503,
      properties: { source: 'http-dependency', accountId: 'private-account' },
    });
    await flushAppInsights();

    expect(mockEnvelopes).toHaveLength(1);
    const envelope = mockEnvelopes[0];
    expect(envelope.data.baseType).toBe('RemoteDependencyData');
    expect(envelope.data.baseData).toMatchObject({
      name: 'POST /users/alice',
      type: 'Http',
      target: 'api.example.com',
      data: '',
      success: false,
      resultCode: '503',
    });
    expect(envelope.data.baseData.duration).toMatch(/^00:00:01\.2340*$/);
    expect(Date.parse(envelope.time)).toBe(now - 1234);
    expect(envelope.data.baseData.properties).toMatchObject({
      dependencyType: 'HTTP',
      telemetrySchemaVersion: '2',
    });
    expect(
      exportSpans.mock.calls[0][0][0].attributes['http.request.method'],
    ).toBe('POST');
    ['secret', 'https://', '?token=', 'private-account'].forEach((value) =>
      expect(JSON.stringify(envelope)).not.toContain(value),
    );
  });

  it('exports website operations with a stable integration target', async () => {
    initialize();
    trackDependency({
      name: 'Post FILE',
      target: 'bluesky',
      dependencyType: 'Website',
      duration: 250,
      success: true,
      properties: { website: 'bluesky', submissionType: 'FILE', stage: 'post' },
    });
    await flushAppInsights();

    expect(mockEnvelopes).toHaveLength(1);
    expect(mockEnvelopes[0].data.baseData).toMatchObject({
      name: 'Post FILE',
      target: 'bluesky',
      success: true,
      properties: { dependencyType: 'Website', website: 'bluesky' },
    });
  });

  it('exports error-level traces, never resource, performance, or SDK metrics', async () => {
    initialize();
    trackErrorLog('Website rejected the request', {
      source: 'winston',
      userId: 'private-user',
    });
    await flushAppInsights();

    expect(mockEnvelopes).toHaveLength(1);
    expect(mockEnvelopes[0].data.baseType).toBe('MessageData');
    expect(mockEnvelopes[0].data.baseData).toMatchObject({
      message: 'Website rejected the request',
      severityLevel: 'Error',
      properties: { source: 'winston', telemetrySchemaVersion: '2' },
    });
    expect(process.env.APPLICATION_INSIGHTS_NO_STATSBEAT).toBe('true');
    expect(process.env.APPLICATIONINSIGHTS_STATSBEAT_DISABLED).toBe('true');
    expect(
      process.env.APPLICATIONINSIGHTS_OPENTELEMETRY_RESOURCE_METRIC_DISABLED,
    ).toBe('true');
    expect(
      process.env.APPLICATIONINSIGHTS_SDKSTATS_ENABLED_PREVIEW,
    ).toBeUndefined();
  });

  it('waits for export completion when flushing', async () => {
    initialize();
    let release: () => void = () => undefined;
    let received: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const requestReceived = new Promise<void>((resolve) => {
      received = resolve;
    });
    const defaultSend = jest
      .mocked(mockHttpClient.sendRequest)
      .getMockImplementation();
    if (!defaultSend) throw new Error('Expected the test HTTP transport');
    jest
      .mocked(mockHttpClient.sendRequest)
      .mockImplementationOnce(async (request) => {
        received();
        await gate;
        return defaultSend(request);
      });

    trackErrorLog('Failure');
    let finished = false;
    const flushing = flushAppInsights().then(() => {
      finished = true;
    });
    await requestReceived;
    expect(finished).toBe(false);
    release();
    await flushing;
    expect(finished).toBe(true);
  });

  it('reports invalid configuration without leaving a partially initialized client', () => {
    const report = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    initializeAppInsights({ enabled: true, connectionString: 'invalid' });
    expect(isAppInsightsInitialized()).toBe(false);
    expect(report).toHaveBeenCalled();
  });

  it('awaits both providers before surfacing a flush failure', async () => {
    initialize();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    jest
      .spyOn(BasicTracerProvider.prototype, 'forceFlush')
      .mockRejectedValueOnce(new Error('Test export failure'));
    jest
      .spyOn(LoggerProvider.prototype, 'forceFlush')
      .mockReturnValueOnce(gate);
    let finished = false;
    const flushing = flushAppInsights().finally(() => {
      finished = true;
    });
    const rejected = expect(flushing).rejects.toThrow(AggregateError);
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    expect(finished).toBe(false);
    release();
    await rejected;
  });

  it('reports invalid dependency measurements instead of exporting them', async () => {
    initialize();
    const report = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    trackDependency({
      name: 'GET',
      target: 'https://example.com',
      dependencyType: 'HTTP',
      duration: NaN,
      success: false,
    });
    await flushAppInsights();
    expect(report).toHaveBeenCalledWith(
      'Failed to track dependency:',
      expect.any(RangeError),
    );
    expect(mockEnvelopes).toHaveLength(0);
  });
});
