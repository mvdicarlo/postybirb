import {
  ApplicationInsights,
  ITelemetryItem,
} from '@microsoft/applicationinsights-web';

const sdk = {
  addTelemetryInitializer: jest.fn(),
  loadAppInsights: jest.fn(),
  trackException: jest.fn(),
};
jest.mock('@microsoft/applicationinsights-web', () => ({
  ApplicationInsights: jest.fn(() => sdk),
}));
const installationId = '7edb828d-387a-4e61-9f7c-f2fd4c7a12bb';

describe('UI error telemetry', () => {
  let telemetry: typeof import('./app-insights-ui');
  const listeners = new Map<string, (event: unknown) => void>();
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    listeners.clear();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        electron: {
          app_version: '4.1.1',
          telemetry_installation_id: installationId,
        },
        addEventListener: (name: string, handler: (event: unknown) => void) => {
          listeners.set(name, handler);
        },
      },
    });
    telemetry = await import('./app-insights-ui');
  });

  afterEach(() => {
    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', originalWindow);
    } else {
      Reflect.deleteProperty(globalThis, 'window');
    }
    jest.restoreAllMocks();
  });

  function initialize(): void {
    telemetry.initializeAppInsightsUI({
      connectionString: 'test-connection-string',
    });
  }

  function initializer(): (envelope: ITelemetryItem) => boolean {
    return sdk.addTelemetryInitializer.mock.calls[0][0];
  }

  it('stays disabled when unconfigured or explicitly disabled', () => {
    telemetry.initializeAppInsightsUI();
    telemetry.initializeAppInsightsUI({
      connectionString: 'test',
      enabled: false,
    });
    telemetry.trackUIException(new Error('Local-only error'));
    expect(sdk.loadAppInsights).not.toHaveBeenCalled();
    expect(sdk.trackException).not.toHaveBeenCalled();
    expect(listeners.size).toBe(0);
  });

  it('configures exception-only, cookie-free, memory-only telemetry', () => {
    initialize();
    telemetry.initializeAppInsightsUI({
      connectionString: 'test-connection-string',
    });
    expect(sdk.loadAppInsights).toHaveBeenCalledTimes(1);
    const constructor = jest.requireMock<{ ApplicationInsights: jest.Mock }>(
      '@microsoft/applicationinsights-web',
    );
    expect(constructor.ApplicationInsights).toHaveBeenCalledWith({
      config: expect.objectContaining({
        cookieCfg: { enabled: false },
        disableCookiesUsage: true,
        isStorageUseDisabled: true,
        enableSessionStorageBuffer: false,
        enableAutoRouteTracking: false,
        disableExceptionTracking: true,
        enableUnhandledPromiseRejectionTracking: false,
        disableFetchTracking: true,
        disableAjaxTracking: true,
        enableRequestHeaderTracking: false,
        enableResponseHeaderTracking: false,
      }),
    });
  });

  it('removes SDK-generated identity, device, session, and page context', () => {
    initialize();
    const envelope: ITelemetryItem = {
      name: 'exception',
      baseType: 'ExceptionData',
      ext: {
        user: { id: 'private-user' },
        app: { sesId: 'private-session' },
        device: { localId: 'private-device' },
        trace: { name: '/private-page' },
      },
      tags: [{ 'ai.user.id': 'private-user', 'ai.device.os': 'Windows' }],
      data: { accountId: 'private-account' },
      baseData: {
        properties: {
          source: 'error-boundary',
          url: '/private-page',
          accountId: 'private-account',
        },
      },
    };
    expect(initializer()(envelope)).toBe(true);
    expect(envelope.ext).toEqual({});
    expect(envelope.data).toEqual({});
    expect(envelope.tags).toEqual([
      {
        'ai.cloud.role': 'postybirb-ui',
        'ai.cloud.roleInstance': 'postybirb-ui',
        'ai.application.ver': '4.1.1',
        'ai.location.ip': '0.0.0.0',
        'ai.user.id': installationId,
      },
    ]);
    expect(envelope.baseData?.properties).toEqual({
      source: 'error-boundary',
      telemetrySchemaVersion: '2',
    });
    expect(JSON.stringify(envelope)).not.toContain('private-');
  });

  it.each([
    'PageviewData',
    'PageviewPerformanceData',
    'RemoteDependencyData',
    'EventData',
    'MetricData',
    'MessageData',
  ])('drops all non-exception telemetry: %s', (baseType) => {
    initialize();
    expect(initializer()({ name: 'unwanted', baseType })).toBe(false);
  });

  it('preserves useful messages, strips paths, and drops identifying properties', () => {
    initialize();
    const error = new Error(
      "Cannot open '/home/alice/Pictures/private.png': HTTP 403",
    );
    telemetry.trackUIException(error, {
      source: 'error-boundary',
      component: 'SubmissionForm',
      accountId: 'private-account',
    });
    expect(sdk.trackException).toHaveBeenCalledWith({
      exception: expect.objectContaining({
        message: "Cannot open '[local-path]': HTTP 403",
      }),
      severityLevel: 3,
      properties: {
        telemetrySchemaVersion: '2',
        source: 'error-boundary',
        component: 'SubmissionForm',
      },
    });
    expect(error.message).toContain('alice');
  });

  it('captures a window error even when the browser provides no Error object', () => {
    initialize();
    listeners.get('error')?.({
      message: 'UI rendering failed',
      error: undefined,
    });
    expect(sdk.trackException).toHaveBeenCalledWith(
      expect.objectContaining({
        exception: expect.objectContaining({ message: 'UI rendering failed' }),
        properties: { source: 'window.onerror', telemetrySchemaVersion: '2' },
      }),
    );
  });

  it('captures non-Error promise rejections without adding arbitrary reason metadata', () => {
    initialize();
    listeners.get('unhandledrejection')?.({ reason: 'UI action failed' });
    expect(sdk.trackException).toHaveBeenCalledWith(
      expect.objectContaining({
        exception: expect.objectContaining({ message: 'UI action failed' }),
        properties: {
          source: 'unhandledrejection',
          telemetrySchemaVersion: '2',
        },
      }),
    );
  });
});
