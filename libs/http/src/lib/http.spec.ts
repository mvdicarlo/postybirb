import {
  BrowserWindow,
  ClientRequest,
  type ClientRequestConstructorOptions,
  net,
} from 'electron';
import { EventEmitter } from 'events';
import * as http from 'http';
import { Http } from './http';
import type {
  CloudflareChallengeOptions,
  HttpOptions,
  HttpResponse,
  PostOptions,
} from './types';

const CHALLENGE_HTML = '<html><title>Just a moment...</title></html>';
const RESOLVED_HTML = '<html><body>resolved</body></html>';

interface HttpInternals {
  performBrowserWindowGetRequest(
    url: string,
    options: HttpOptions,
    crOptions?: ClientRequestConstructorOptions,
  ): Promise<HttpResponse<unknown> | undefined>;
  performBrowserWindowPostRequest(
    url: string,
    options: PostOptions,
    crOptions: ClientRequestConstructorOptions,
    challengeExpected?: boolean,
  ): Promise<HttpResponse<unknown> | undefined>;
  handleCloudflareChallengePage(
    window: BrowserWindow,
    options?: CloudflareChallengeOptions,
    challengeExpected?: boolean,
  ): Promise<HttpResponse<unknown> | undefined>;
}

const httpInternals = Http as unknown as HttpInternals;

function createChallengeWindow(
  htmlResponses: string[],
  fallbackHtml = RESOLVED_HTML,
) {
  const pendingHtmlResponses = [...htmlResponses];
  const executeJavaScript = jest.fn(async (script: string) => {
    if (script.includes('outerHTML')) {
      return pendingHtmlResponses.shift() ?? fallbackHtml;
    }
    if (script === 'document.body.innerText') {
      return 'resolved';
    }
    if (script === 'window.location.href') {
      return 'https://example.com/resolved';
    }
    return undefined;
  });
  const show = jest.fn();
  const focus = jest.fn();

  return {
    executeJavaScript,
    focus,
    show,
    window: {
      focus,
      isDestroyed: () => false,
      show,
      webContents: { executeJavaScript },
    } as unknown as BrowserWindow,
  };
}

class TestServer {
  private server: http.Server;

  constructor() {
    this.server = http.createServer((req, res) => {
      if (req.url === '/test') {
        res.write('hello');
        res.end();
        return;
      }

      if (req.url === '/redirect') {
        res.writeHead(302, {
          Location: 'http://localhost:3000/test',
        });
        res.end();
        return;
      }

      if (req.url === '/json') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ test: 'hello' }));
        return;
      }

      if (req.url === '/cloudflare') {
        res.setHeader('cf-mitigated', 'challenge');
        res.end(CHALLENGE_HTML);
      }
    });
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(3000, resolve);
    });
  }

  public stop(): void {
    this.server.close();
  }
}

const server = new TestServer();

beforeAll(() => server.start());
afterAll(() => server.stop());

describe('http', () => {
  describe('request timeouts', () => {
    let request: EventEmitter & {
      setHeader: jest.Mock;
      write: jest.Mock;
      end: jest.Mock;
      abort: jest.Mock;
    };

    beforeEach(() => {
      jest.useFakeTimers();
      request = Object.assign(new EventEmitter(), {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
        abort: jest.fn(),
      });
      jest.spyOn(net, 'request').mockReturnValue(request as unknown as ClientRequest);
    });

    afterEach(() => {
      jest.restoreAllMocks();
      jest.useRealTimers();
    });

    it.each(['post', 'put', 'patch'] as const)('bounds %s requests', async (method) => {
      const onRejected = jest.fn();
      const response = Http[method]('https://example.com/stalled', {
        type: 'json', data: {},
      }).catch(onRejected);

      await jest.advanceTimersByTimeAsync(14 * 60 * 1000);
      expect(request.abort).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(60 * 1000);
      expect(request.abort).toHaveBeenCalledTimes(1);
      await response;
      expect(onRejected).toHaveBeenCalledWith(expect.objectContaining({ name: 'TimeoutError' }));
      expect(jest.getTimerCount()).toBe(0);
    });

    it('aborts and rejects a GET that never responds after one minute', async () => {
      const response = Http.get('https://example.com/stalled', {});
      const rejected = expect(response).rejects.toMatchObject({ name: 'TimeoutError' });
      await jest.advanceTimersByTimeAsync(60 * 1000);

      expect(request.abort).toHaveBeenCalledTimes(1);
      await rejected;
      expect(jest.getTimerCount()).toBe(0);
    });

    it('times out a response body that never finishes', async () => {
      const response = Http.get('https://example.com', {});
      const rejected = expect(response).rejects.toMatchObject({ name: 'TimeoutError' });
      const incoming = Object.assign(new EventEmitter(), { headers: {}, statusCode: 200 });
      request.emit('response', incoming);
      await jest.advanceTimersByTimeAsync(30 * 1000);
      incoming.emit('data', Buffer.from('partial'));
      expect(request.abort).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(30 * 1000);

      await rejected;
      expect(request.abort).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('cleans up failed requests and preserves the original error', async () => {
      const reason = new Error('Connection refused');
      const response = Http.get('https://example.com', {});
      const rejected = expect(response).rejects.toBe(reason);
      request.emit('error', reason);

      await rejected;
      expect(request.abort).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('preserves the timeout when abort emits a connection reset', async () => {
      request.abort.mockImplementation(() => request.emit('error', new Error('ECONNRESET')));
      const response = Http.post('https://example.com', { type: 'json', data: {} });
      const rejected = expect(response).rejects.toMatchObject({ name: 'TimeoutError' });
      await jest.advanceTimersByTimeAsync(15 * 60 * 1000);

      await rejected;
      expect(request.abort).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('cleans up successful requests without later aborting them', async () => {
      const response = Http.get('https://example.com', {});
      const incoming = Object.assign(new EventEmitter(), { headers: {}, statusCode: 200 });
      request.emit('response', incoming);
      incoming.emit('data', Buffer.from('done'));
      incoming.emit('end');

      await expect(response).resolves.toMatchObject({ body: 'done' });
      await jest.advanceTimersByTimeAsync(60 * 1000);
      expect(request.abort).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    });

    it('cleans up the timed browser wrapper when hidden resolution is unsuccessful', async () => {
      const challenge = createChallengeWindow([CHALLENGE_HTML], CHALLENGE_HTML);
      jest.spyOn(BrowserWindow.prototype, 'webContents', 'get').mockReturnValue({
        executeJavaScript: challenge.executeJavaScript,
      } as unknown as Electron.WebContents);
      const destroy = jest.spyOn(BrowserWindow.prototype, 'destroy');
      const response = Http.get('https://example.com/cloudflare', {
        cloudflareChallenge: { openBrowserWindow: false },
      });
      const incoming = Object.assign(new EventEmitter(), {
        headers: { 'cf-mitigated': 'challenge' }, statusCode: 403,
      });
      request.emit('response', incoming);
      incoming.emit('data', Buffer.from(CHALLENGE_HTML));
      incoming.emit('end');

      await jest.advanceTimersByTimeAsync(3000);

      await expect(response).resolves.toMatchObject({
        body: CHALLENGE_HTML, statusCode: 403,
      });
      expect(destroy).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('times out browser challenge loading after five minutes', async () => {
      jest.spyOn(BrowserWindow.prototype, 'loadURL').mockImplementation(() => new Promise(() => undefined));
      const destroy = jest.spyOn(BrowserWindow.prototype, 'destroy');
      const response = Http.get('https://example.com', {
        cloudflareChallenge: { openBrowserWindow: true },
      });
      const rejected = expect(response).rejects.toMatchObject({ name: 'TimeoutError' });
      const incoming = Object.assign(new EventEmitter(), {
        headers: { 'cf-mitigated': 'challenge' }, statusCode: 403,
      });
      request.emit('response', incoming);
      incoming.emit('end');
      await jest.advanceTimersByTimeAsync(5 * 60 * 1000);

      await rejected;
      expect(destroy).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('bounds browser response processing as well as loading', async () => {
      jest.spyOn(BrowserWindow.prototype, 'webContents', 'get').mockReturnValue({
        executeJavaScript: jest.fn().mockImplementation(() => new Promise(() => undefined)),
      } as unknown as Electron.WebContents);
      const destroy = jest.spyOn(BrowserWindow.prototype, 'destroy');
      const response = Http.post('https://example.com', {
        type: 'binary', data: Buffer.from('upload'), uploadAsRawData: true,
      });
      const rejected = expect(response).rejects.toMatchObject({ name: 'TimeoutError' });
      await jest.advanceTimersByTimeAsync(15 * 60 * 1000);

      await rejected;
      expect(destroy).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('destroys a browser upload that never finishes loading', async () => {
      jest.spyOn(BrowserWindow.prototype, 'loadURL').mockImplementation(() => new Promise(() => undefined));
      const destroy = jest.spyOn(BrowserWindow.prototype, 'destroy');
      const response = Http.post('https://example.com', {
        type: 'binary', data: Buffer.from('upload'), uploadAsRawData: true,
      });
      const rejected = expect(response).rejects.toMatchObject({ name: 'TimeoutError' });
      await jest.advanceTimersByTimeAsync(15 * 60 * 1000);

      await rejected;
      expect(destroy).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should retrieve server response', async () => {
    const res = await Http.get<string>('http://localhost:3000/test', {
      partition: 'test',
    });

    expect(res).toBeTruthy();
    expect(res.body).toBe('hello');
  });

  it('should follow redirect', async () => {
    const res = await Http.get<string>('http://localhost:3000/redirect', {
      partition: 'test',
    });

    expect(res).toBeTruthy();
    expect(res.body).toBe('hello');
    expect(res.responseUrl).toBe('http://localhost:3000/test');
  });

  it('should parse json', async () => {
    const res = await Http.get<{ test: string }>('http://localhost:3000/json', {
      partition: 'test',
    });

    expect(res).toBeTruthy();
    expect(res.body).toEqual({ test: 'hello' });
  });

  it('attempts an invisible browser resolution for a GET when interaction is disabled', async () => {
    const browserResponse: HttpResponse<string> = {
      body: 'resolved',
      statusCode: 200,
      statusMessage: 'OK',
      responseUrl: 'http://localhost:3000/resolved',
    };
    const browserRequest = jest
      .spyOn(httpInternals, 'performBrowserWindowGetRequest')
      .mockResolvedValue(browserResponse);

    const response = await Http.get<string>(
      'http://localhost:3000/cloudflare',
      {
        partition: 'test',
        cloudflareChallenge: { openBrowserWindow: false },
      },
    );

    expect(browserRequest).toHaveBeenCalledTimes(1);
    expect(response).toEqual(browserResponse);
  });

  it('returns the original GET challenge when invisible resolution fails and interaction is disabled', async () => {
    jest
      .spyOn(httpInternals, 'performBrowserWindowGetRequest')
      .mockResolvedValue(undefined);

    const response = await Http.get<string>(
      'http://localhost:3000/cloudflare',
      {
        partition: 'test',
        cloudflareChallenge: { openBrowserWindow: false },
      },
    );

    expect(response.body).toBe(CHALLENGE_HTML);
  });

  it('attempts an invisible browser resolution for a POST when interaction is disabled', async () => {
    const browserResponse: HttpResponse<string> = {
      body: 'resolved',
      statusCode: 200,
      statusMessage: 'OK',
      responseUrl: 'http://localhost:3000/resolved',
    };
    const browserRequest = jest
      .spyOn(httpInternals, 'performBrowserWindowPostRequest')
      .mockResolvedValue(browserResponse);

    const response = await Http.post<string>(
      'http://localhost:3000/cloudflare',
      {
        partition: 'test',
        type: 'json',
        data: {},
        cloudflareChallenge: { openBrowserWindow: false },
      },
    );

    expect(browserRequest).toHaveBeenCalledTimes(1);
    expect(response).toEqual(browserResponse);
  });
});

describe('Cloudflare browser resolution', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves a challenge invisibly when interaction is disabled', async () => {
    const { show, window } = createChallengeWindow([
      CHALLENGE_HTML,
      RESOLVED_HTML,
      RESOLVED_HTML,
    ]);
    const responsePromise = httpInternals.handleCloudflareChallengePage(
      window,
      { openBrowserWindow: false },
    );
    const resultPromise = responsePromise.then(
      (response) => ({ response }),
      (error) => ({ error }),
    );

    await jest.advanceTimersByTimeAsync(1000);

    expect(await resultPromise).toMatchObject({
      response: { body: RESOLVED_HTML },
    });
    expect(show).not.toHaveBeenCalled();
  });

  it('resolves a challenge invisibly before prompting when interaction is enabled', async () => {
    const { focus, show, window } = createChallengeWindow([
      CHALLENGE_HTML,
      RESOLVED_HTML,
      RESOLVED_HTML,
    ]);
    const responsePromise = httpInternals.handleCloudflareChallengePage(
      window,
      { openBrowserWindow: true },
    );

    await jest.advanceTimersByTimeAsync(1000);

    await expect(responsePromise).resolves.toMatchObject({
      body: RESOLVED_HTML,
    });
    expect(show).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
  });

  it('does not show an unresolved challenge when interaction is disabled', async () => {
    const { focus, show, window } = createChallengeWindow(
      [CHALLENGE_HTML],
      CHALLENGE_HTML,
    );
    const responsePromise = httpInternals.handleCloudflareChallengePage(
      window,
      { openBrowserWindow: false },
    );
    const resultPromise = responsePromise.then(
      (response) => ({ response }),
      (error) => ({ error }),
    );

    await jest.advanceTimersByTimeAsync(3000);

    expect(await resultPromise).toEqual({ response: undefined });
    expect(show).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
  });

  it('shows an unresolved challenge only after the invisible attempt', async () => {
    const { focus, show, window } = createChallengeWindow([
      CHALLENGE_HTML,
      CHALLENGE_HTML,
      CHALLENGE_HTML,
      CHALLENGE_HTML,
      RESOLVED_HTML,
      RESOLVED_HTML,
    ]);
    const responsePromise = httpInternals.handleCloudflareChallengePage(
      window,
      { openBrowserWindow: true, timeoutMs: 1000 },
    );

    await jest.advanceTimersByTimeAsync(2999);
    expect(show).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    expect(show).toHaveBeenCalledTimes(1);
    expect(focus).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1000);
    await expect(responsePromise).resolves.toMatchObject({
      body: RESOLVED_HTML,
    });
  });

  it('retains the interactive timeout after showing the challenge', async () => {
    const { show, window } = createChallengeWindow(
      [CHALLENGE_HTML],
      CHALLENGE_HTML,
    );
    const responsePromise = httpInternals.handleCloudflareChallengePage(
      window,
      { openBrowserWindow: true, timeoutMs: 1000 },
    );
    const resultPromise = responsePromise.then(
      (response) => ({ response }),
      (error) => ({ error }),
    );

    await jest.advanceTimersByTimeAsync(4000);

    expect(await resultPromise).toMatchObject({
      error: { message: 'Timed out waiting for the Cloudflare challenge.' },
    });
    expect(show).toHaveBeenCalledTimes(1);
  });
});
