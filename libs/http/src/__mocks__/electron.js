/**
 * Mock for the `electron` module used in libs/http tests.
 * Implements Electron's net/session/BrowserWindow APIs using Node's built-in http module.
 */
const http = require('http');
const https = require('https');

const partitionSessions = new Map();
const sessionStates = new WeakMap();

function createSession(partitionId) {
  const sessionState = {
    proxyConfig: { mode: 'system' },
    resolveProxyResult: 'DIRECT',
  };
  const session = {
    setProxy: async function (config) {
      sessionState.proxyConfig = config || { mode: 'system' };
    },
    resolveProxy: async function () {
      return sessionState.resolveProxyResult;
    },
    closeAllConnections: function () {},
    forceReloadProxyConfig: async function () {},
    setCertificateVerifyProc: function () {},
    cookies: {
      get: async function () {
        return [];
      },
      set: async function () {},
      remove: async function () {},
    },
    __partitionId: partitionId,
  };

  sessionStates.set(session, sessionState);
  return session;
}

function getSession(partitionId) {
  if (!partitionSessions.has(partitionId)) {
    partitionSessions.set(partitionId, createSession(partitionId));
  }
  return partitionSessions.get(partitionId);
}

function getSessionState(session) {
  return sessionStates.get(session);
}

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

const defaultSession = createSession('default');
defaultSession.__partitionId = 'default';

let appProxyConfig = null;

const appHandlers = {
  ready: [],
  'session-created': [],
  login: [],
};

module.exports = {
  app: {
    on: function (event, handler) {
      if (appHandlers[event]) {
        appHandlers[event].push(handler);
      }
    },
    isReady: function () {
      return true;
    },
    setProxy: async function (config) {
      appProxyConfig = config || { mode: 'system' };
    },
  },

  __getAppProxyConfig: function () {
    return appProxyConfig;
  },

  __resetAppProxyConfig: function () {
    appProxyConfig = null;
  },

  __getSessionProxyConfig: function (session) {
    const state = getSessionState(session);
    return state ? state.proxyConfig : undefined;
  },

  __setSessionProxyConfig: function (session, config) {
    const state = getSessionState(session);
    if (state) {
      state.proxyConfig = config || { mode: 'system' };
    }
  },

  net: {
    isOnline: function () {
      return true;
    },
    request: makeElectronNetRequest,
    fetch: async function (input, init) {
      return fetch(input, init);
    },
  },

  session: {
    defaultSession: defaultSession,
    resolveProxy: async function () {
      return defaultSession.resolveProxy();
    },
    fromPartition: function (partitionId) {
      const sess = getSession(partitionId || 'default');
      sess.__partitionId = partitionId || 'default';
      return sess;
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
