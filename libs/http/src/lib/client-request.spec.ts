import { Logger } from '@nestjs/common';
import { type ClientRequestConstructorOptions, net } from 'electron';
import { EventEmitter } from 'events';
import { requestWithClientRequest } from './client-request';
import { createRequestBody } from './request-body';
import type { PostOptions } from './types';

describe('requestWithClientRequest', () => {
  let request: EventEmitter & {
    chunkedEncoding: boolean;
    setHeader: jest.Mock;
    write: jest.Mock;
    end: jest.Mock;
    abort: jest.Mock;
    followRedirect: jest.Mock;
    getHeader: jest.Mock;
    getUploadProgress: jest.Mock;
    removeHeader: jest.Mock;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    request = Object.assign(new EventEmitter(), {
      chunkedEncoding: false,
      setHeader: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      abort: jest.fn(),
      followRedirect: jest.fn(),
      getHeader: jest.fn(),
      getUploadProgress: jest.fn(),
      removeHeader: jest.fn(),
    });
    jest.spyOn(net, 'request').mockReturnValue(request);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  function respond(
    chunks: string[] = ['done'],
    headers: Record<string, string | string[]> = {},
  ) {
    const incoming = Object.assign(new EventEmitter(), {
      headers,
      statusCode: 200,
      statusMessage: 'OK',
    });
    request.emit('response', incoming);
    chunks.forEach((chunk) => incoming.emit('data', Buffer.from(chunk)));
    incoming.emit('end');
  }

  it('applies query parameters, session partitions, headers, and constructor options without mutating inputs', async () => {
    const url = 'https://example.com/path?old=1';
    const options = {
      partition: 'account',
      queryParameters: { page: 2 },
      headers: { Authorization: 'Bearer token' },
    };
    const crOptions: ClientRequestConstructorOptions & { url: string } = {
      url,
      method: 'GET',
      redirect: 'manual',
    };
    const response = requestWithClientRequest(url, options, crOptions);
    respond();

    await expect(response).resolves.toMatchObject({ body: 'done' });
    expect(net.request).toHaveBeenCalledWith({
      url: 'https://example.com/path?page=2',
      method: 'GET',
      redirect: 'manual',
      useSessionCookies: true,
      partition: 'persist:account',
    });
    expect(request.setHeader).toHaveBeenCalledWith(
      'Authorization',
      'Bearer token',
    );
    expect(crOptions).toEqual({ url, method: 'GET', redirect: 'manual' });
    expect(options.partition).toBe('account');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('does not override constructor session options for a blank partition', async () => {
    const url = 'https://example.com';
    const response = requestWithClientRequest(
      url,
      { partition: ' ' },
      {
        url,
        partition: 'custom',
        useSessionCookies: false,
      },
    );
    respond();

    await response;
    expect(net.request).toHaveBeenCalledWith({
      url,
      partition: 'custom',
      useSessionCookies: false,
    });
  });

  it.each(['POST', 'PUT', 'PATCH'])(
    'sets multipart and default headers for an explicit %s constructor method',
    async (method) => {
      const url = 'https://example.com';
      const options: PostOptions = {
        type: 'multipart',
        data: { title: 'Example' },
        headers: { 'Accept-Encoding': 'identity' },
      };
      const body = createRequestBody(options);
      const response = requestWithClientRequest(
        url,
        options,
        { url, method },
        body,
      );
      respond();

      await response;
      expect(request.chunkedEncoding).toBe(true);
      expect(request.setHeader).toHaveBeenNthCalledWith(
        1,
        'Accept-Encoding',
        'gzip, deflate, br',
      );
      expect(request.setHeader).toHaveBeenNthCalledWith(
        2,
        'Accept-Encoding',
        'identity',
      );
      expect(request.setHeader).toHaveBeenLastCalledWith(
        'Content-Type',
        body.contentType,
      );
      expect(request.write).toHaveBeenCalledWith(body.buffer);
      expect(request.end).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    'Content-Length',
    'Host',
    'Trailer',
    'TE',
    'Upgrade',
    'Cookie2',
    'Keep-Alive',
    'Transfer-Encoding',
  ])('rejects the restricted header %s before sending', async (header) => {
    const url = 'https://example.com';
    await expect(
      requestWithClientRequest(
        url,
        {
          headers: { [header]: 'value' },
        },
        { url },
      ),
    ).rejects.toThrow(`Not allowed to set header: ${header}`);

    expect(Logger.prototype.error).toHaveBeenCalled();
    expect(request.end).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it.each(['application/json', 'application/vnd.api+json'])(
    'decodes chunked %s responses and retains the final redirect URL',
    async (contentType) => {
      const url = 'https://example.com';
      const response = requestWithClientRequest(url, {}, { url });
      request.emit('redirect', 302, 'GET', 'https://example.com/intermediate');
      request.emit('redirect', 302, 'GET', 'https://example.com/final');
      respond(['{"test":', '"hello"}'], { 'content-type': contentType });

      await expect(response).resolves.toEqual({
        body: { test: 'hello' },
        statusCode: 200,
        statusMessage: 'OK',
        responseUrl: 'https://example.com/final',
        isCloudflareChallenge: false,
      });
    },
  );

  it('logs malformed JSON and preserves the response text', async () => {
    const url = 'https://example.com';
    const response = requestWithClientRequest(url, {}, { url });
    respond(['invalid json'], { 'content-type': 'application/json' });

    await expect(response).resolves.toMatchObject({ body: 'invalid json' });
    expect(Logger.prototype.warn).toHaveBeenCalledWith(
      `Unable to parse application/json to object.\nUrl:${url}\nBody: invalid json`,
    );
  });

  it('marks challenge responses for the caller to handle', async () => {
    const url = 'https://example.com';
    const response = requestWithClientRequest(url, {}, { url });
    respond(['challenge'], { 'CF-Mitigated': [' challenge '] });

    await expect(response).resolves.toMatchObject({
      body: 'challenge',
      isCloudflareChallenge: true,
    });
  });

  it('aborts and cleans up when writing the body fails', async () => {
    const reason = new Error('Write failed');
    request.write.mockImplementation(() => {
      throw reason;
    });
    const url = 'https://example.com';
    const response = requestWithClientRequest(
      url,
      {},
      { url },
      {
        contentType: 'application/octet-stream',
        buffer: Buffer.from('upload'),
      },
    );

    await expect(response).rejects.toBe(reason);
    expect(request.abort).toHaveBeenCalledTimes(1);
    expect(request.end).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('rejects external aborts and cleans up the request timeout', async () => {
    const url = 'https://example.com';
    const response = requestWithClientRequest(url, {}, { url });
    request.emit('abort');

    await expect(response).rejects.toThrow('HTTP request aborted');
    expect(jest.getTimerCount()).toBe(0);
  });
});
