import { requestWithBrowserWindow } from './browser-request';
import { createRequestBody } from './request-body';

const electron = jest.requireActual<typeof import('electron')>('electron');
const BrowserWindowConstructor = electron.BrowserWindow;

describe('requestWithBrowserWindow', () => {
  let window: Electron.BrowserWindow;
  let page: { html: string; text: string; url: string };
  let executeJavaScript: jest.Mock<Promise<string>, [string]>;

  beforeEach(() => {
    jest.useFakeTimers();
    page = {
      html: '<html><body>resolved</body></html>',
      text: 'resolved',
      url: 'https://example.com/resolved',
    };
    executeJavaScript = jest.fn(async (script: string) => {
      if (script.includes('outerHTML')) return page.html;
      if (script === 'document.body.innerText') return page.text;
      if (script === 'window.location.href') return page.url;
      throw new Error(`Unexpected browser script: ${script}`);
    });
    jest.spyOn(electron, 'BrowserWindow').mockImplementation((options) => {
      window = new BrowserWindowConstructor(options);
      const contents = window.webContents;
      jest
        .spyOn(contents, 'executeJavaScript')
        .mockImplementation(executeJavaScript);
      jest.spyOn(window, 'webContents', 'get').mockReturnValue(contents);
      return window;
    });
    jest.spyOn(BrowserWindowConstructor.prototype, 'loadURL');
    jest.spyOn(BrowserWindowConstructor.prototype, 'destroy');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('uses a hidden partitioned window and the shared query construction', async () => {
    await expect(
      requestWithBrowserWindow('https://example.com?old=1', {
        partition: 'account',
        queryParameters: { page: 2 },
      }),
    ).resolves.toEqual({
      body: page.html,
      statusCode: 200,
      statusMessage: 'OK',
      responseUrl: page.url,
    });

    expect(electron.BrowserWindow).toHaveBeenCalledWith({
      show: false,
      webPreferences: { partition: 'persist:account' },
    });
    expect(window.loadURL).toHaveBeenCalledWith(
      'https://example.com/?page=2',
      undefined,
    );
    expect(window.destroy).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('sends the prepared raw body with its content type and custom headers', async () => {
    const body = createRequestBody({
      type: 'json',
      data: { title: 'Example' },
    });
    await requestWithBrowserWindow(
      'https://example.com',
      {
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'ignored',
        },
      },
      body,
    );

    expect(window.loadURL).toHaveBeenCalledWith('https://example.com', {
      extraHeaders:
        'Authorization: Bearer token\nContent-Type: application/json',
      postData: [{ type: 'rawData', bytes: body.buffer }],
    });
    expect(window.destroy).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('decodes JSON objects from the browser body text', async () => {
    page.text = '{"test":"hello"}';

    await expect(
      requestWithBrowserWindow('https://example.com', {}),
    ).resolves.toMatchObject({ body: { test: 'hello' } });
  });

  it('logs malformed JSON and retains the page HTML', async () => {
    page.text = '{invalid json}';
    const log = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    await expect(
      requestWithBrowserWindow('https://example.com', {}),
    ).resolves.toMatchObject({ body: page.html });
    expect(log).toHaveBeenCalledWith(
      page.url,
      page.text,
      expect.any(SyntaxError),
    );
  });

  it('destroys the window and clears its timeout when loading fails', async () => {
    const reason = new Error('Load failed');
    jest
      .mocked(BrowserWindowConstructor.prototype.loadURL)
      .mockRejectedValue(reason);

    await expect(
      requestWithBrowserWindow('https://example.com', {}),
    ).rejects.toBe(reason);
    expect(window.destroy).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('destroys the window and clears its timeout when response extraction fails', async () => {
    const reason = new Error('Script failed');
    executeJavaScript.mockRejectedValue(reason);

    await expect(
      requestWithBrowserWindow('https://example.com', {}),
    ).rejects.toBe(reason);
    expect(window.destroy).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('rejects when the window is closed during loading without destroying it twice', async () => {
    jest
      .mocked(BrowserWindowConstructor.prototype.loadURL)
      .mockImplementation(async () => window.destroy());

    await expect(
      requestWithBrowserWindow('https://example.com', {}),
    ).rejects.toThrow('HTTP request window was closed');
    expect(window.destroy).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });
});
