import { createTimeoutError, getRequestUrl } from './request-utils';

describe('getRequestUrl', () => {
  it('preserves the input URL when no query parameters are supplied', () => {
    const url = 'https://example.com?existing=1#section';
    expect(getRequestUrl(url, {})).toBe(url);
  });

  it('replaces existing queries while retaining the fragment', () => {
    expect(
      getRequestUrl('https://example.com/path?old=1#section', {
        queryParameters: { page: 2 },
      }),
    ).toBe('https://example.com/path?page=2#section');
  });

  it('encodes scalar and repeated query parameters', () => {
    const result = new URL(
      getRequestUrl('https://example.com/path', {
        queryParameters: {
          title: 'a & b',
          page: 2,
          enabled: false,
          tags: ['one', 'two'],
          ids: [1, 2],
          flags: [true, false],
        },
      }),
    );

    expect(result.searchParams.get('title')).toBe('a & b');
    expect(result.searchParams.get('page')).toBe('2');
    expect(result.searchParams.get('enabled')).toBe('false');
    expect(result.searchParams.getAll('tags')).toEqual(['one', 'two']);
    expect(result.searchParams.getAll('ids')).toEqual(['1', '2']);
    expect(result.searchParams.getAll('flags')).toEqual(['true', 'false']);
  });

  it('clears the existing query when given an empty parameter object', () => {
    expect(
      getRequestUrl('https://example.com/path?old=1', {
        queryParameters: {},
      }),
    ).toBe('https://example.com/path');
  });
});

describe('createTimeoutError', () => {
  it('retains the timeout error name and duration', () => {
    const error = createTimeoutError(60_000);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('TimeoutError');
    expect(error.message).toBe('HTTP request timed out after 60000ms');
  });
});

describe('Electron-free utility entry point', () => {
  it('loads and runs helpers without importing Electron', () => {
    jest.doMock('electron', () => {
      throw new Error('Electron must not be loaded by HTTP utilities');
    });

    try {
      jest.isolateModules(() => {
        const utils = jest.requireActual<
          typeof import('@postybirb/http/utils')
        >('@postybirb/http/utils');
        expect(
          utils
            .createRequestBody({
              type: 'json',
              data: { title: 'Example' },
            })
            .buffer.toString(),
        ).toBe('{"title":"Example"}');
        expect(
          utils.getRequestUrl('https://example.com', {
            queryParameters: { page: 1 },
          }),
        ).toBe('https://example.com/?page=1');
        expect(
          utils.isCloudflareChallengeResponse(
            {
              'cf-mitigated': 'challenge',
            },
            '',
          ),
        ).toBe(true);
        expect(
          utils.isCloudflareChallengePage('<title>Just a moment...</title>'),
        ).toBe(true);
      });
    } finally {
      jest.dontMock('electron');
    }
  });
});
