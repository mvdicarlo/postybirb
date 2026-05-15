/**
 * Mock for the `electron` module used in libs/http tests.
 * Implements Electron's net/session/BrowserWindow APIs using Node's built-in http module.
 */
const http = require('http');
const https = require('https');

function performRequest(url, method, headers, body, eventHandlers, redirectCount) {
  if (redirectCount === undefined) redirectCount = 0;

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (e) {
    if (eventHandlers['error']) eventHandlers['error'](e);
    return;
  }

  const lib = parsedUrl.protocol === 'https:' ? https : http;

  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
    path: (parsedUrl.pathname || '/') + (parsedUrl.search || ''),
    method: method,
    headers: headers || {},
  };

  const nodeReq = lib.request(options, function (nodeRes) {
    if (
      nodeRes.statusCode >= 300 &&
      nodeRes.statusCode < 400 &&
      nodeRes.headers.location &&
      redirectCount < 10
    ) {
      const redirectUrl = nodeRes.headers.location;
      if (eventHandlers['redirect']) {
        eventHandlers['redirect'](
          nodeRes.statusCode,
          method,
          redirectUrl,
          nodeRes.headers,
        );
      }
      // Consume redirect response body before following
      nodeRes.resume();
      performRequest(redirectUrl, method, headers, body, eventHandlers, redirectCount + 1);
      return;
    }

    const responseProxy = {
      headers: nodeRes.headers,
      statusCode: nodeRes.statusCode,
      statusMessage: nodeRes.statusMessage,
      on: function (event, handler) {
        if (event === 'data' || event === 'end' || event === 'error' || event === 'aborted') {
          nodeRes.on(event, handler);
        }
        return responseProxy;
      },
    };

    if (eventHandlers['response']) {
      eventHandlers['response'](responseProxy);
    }
  });

  nodeReq.on('error', function (err) {
    if (eventHandlers['error']) eventHandlers['error'](err);
  });

  if (body) nodeReq.write(body);
  nodeReq.end();
}

function makeElectronNetRequest(options) {
  const url = options.url;
  const method = (options.method || 'GET').toUpperCase();
  const headers = {};
  let body = null;
  const eventHandlers = {};

  const clientRequest = {
    chunkedEncoding: false,

    setHeader: function (key, value) {
      headers[key] = value;
    },

    on: function (event, handler) {
      eventHandlers[event] = handler;
      return clientRequest;
    },

    write: function (data) {
      body = data;
    },

    end: function () {
      performRequest(url, method, headers, body, eventHandlers, 0);
    },
  };

  return clientRequest;
}

module.exports = {
  net: {
    isOnline: function () {
      return true;
    },
    request: makeElectronNetRequest,
  },

  session: {
    fromPartition: function () {
      return {
        cookies: {
          get: async function () {
            return [];
          },
          set: async function () {},
          remove: async function () {},
        },
      };
    },
  },

  BrowserWindow: (function () {
    function BrowserWindow() {}
    BrowserWindow.prototype.loadURL = function () {
      return Promise.resolve();
    };
    BrowserWindow.prototype.destroy = function () {};
    BrowserWindow.prototype.show = function () {};
    BrowserWindow.prototype.focus = function () {};
    Object.defineProperty(BrowserWindow.prototype, 'webContents', {
      get: function () {
        return {
          executeJavaScript: async function () {
            return '<html></html>';
          },
          send: function () {},
        };
      },
    });
    return BrowserWindow;
  })(),

  ClientRequest: function () {},
  ClientRequestConstructorOptions: {},
};
