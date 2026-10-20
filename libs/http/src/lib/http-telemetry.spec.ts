import { trackDependency, trackException } from '@postybirb/logger';
import { trackHttpDependency } from './http-telemetry';

jest.mock('@postybirb/logger', () => ({
  trackDependency: jest.fn(),
  trackException: jest.fn(),
}));

describe('trackHttpDependency', () => {
  beforeEach(() => {
    jest.mocked(trackDependency).mockReset();
    jest.mocked(trackException).mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reports endpoint paths, duration, status, and success', () => {
    const url = 'https://example.com/api?token=secret#private';
    trackHttpDependency('GET', url, 200, 123, true);

    expect(trackDependency).toHaveBeenCalledWith({
      name: 'GET /api',
      target: url,
      dependencyType: 'HTTP',
      duration: 123,
      success: true,
      resultCode: 200,
      properties: {
        source: 'http-dependency',
        method: 'GET',
        hasError: 'false',
      },
    });
    expect(trackException).not.toHaveBeenCalled();
  });

  it('reports the original exception with request metadata', () => {
    const error = new Error('Connection failed');
    trackHttpDependency(
      'POST',
      'https://example.com/api',
      503,
      456,
      false,
      error,
    );

    expect(trackException).toHaveBeenCalledWith(error, {
      source: 'http-dependency',
      method: 'POST',
      statusCode: '503',
    });
    expect(trackDependency).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        properties: expect.objectContaining({ hasError: 'true' }),
      }),
    );
  });

  it.each(['dependency', 'exception'] as const)(
    'logs %s tracking failures without throwing into the HTTP request',
    (trackingType) => {
      const reason = new Error('Telemetry failed');
      const track =
        trackingType === 'dependency'
          ? jest.mocked(trackDependency)
          : jest.mocked(trackException);
      track.mockImplementationOnce(() => {
        throw reason;
      });
      const log = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      expect(() =>
        trackHttpDependency(
          'GET',
          'https://example.com/api',
          0,
          123,
          false,
          new Error('HTTP failed'),
        ),
      ).not.toThrow();
      expect(log).toHaveBeenCalledWith(
        'Error tracking HTTP dependency:',
        reason,
      );
    },
  );
});
