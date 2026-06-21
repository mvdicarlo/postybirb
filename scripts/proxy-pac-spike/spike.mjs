/**
 * Phase 0 spike: PAC script mode + resolveProxy + optional live proxy auth.
 * Run: npx electron scripts/proxy-pac-spike/spike.mjs [--live]
 */
import { app, net, session } from 'electron';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LIVE = process.argv.includes('--live');

const LOG_LEVEL = process.env.SPIKE_LOG_LEVEL ?? 'info';

function log(level, message, meta) {
  const levels = { debug: 0, info: 1, warn: 2, error: 3 };
  if ((levels[level] ?? 1) < (levels[LOG_LEVEL] ?? 1)) {
    return;
  }
  const suffix = meta ? ` ${JSON.stringify(meta)}` : '';
  console.log(`[SpikePac][${level.toUpperCase()}] ${message}${suffix}`);
}

function buildPacScript(proxyHost, proxyPort, proxyType) {
  const proxyReturn =
    proxyType === 'socks5'
      ? `return "SOCKS5 ${proxyHost}:${proxyPort}";`
      : `return "PROXY ${proxyHost}:${proxyPort}";`;

  return `
function FindProxyForURL(url, host) {
  if (host === "127.0.0.1" || host === "localhost") return "DIRECT";
  if (dnsDomainIs("proxy-target.test", host)) {
    ${proxyReturn}
  }
  if (dnsDomainIs("direct-target.test", host)) return "DIRECT";
  return "DIRECT";
}
`.trim();
}

function startPacServer(pacContent) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((_req, res) => {
      res.writeHead(200, {
        'Content-Type': 'application/x-ns-proxy-autoconfig',
        'Cache-Control': 'no-store',
      });
      res.end(pacContent);
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to bind PAC server'));
        return;
      }
      const pacUrl = `http://127.0.0.1:${address.port}/proxy.pac`;
      log('info', 'PAC HTTP server listening', { pacUrl });
      resolve({ server, pacUrl });
    });
  });
}

function registerAppLoginHandler(credentials) {
  app.on('login', (event, _webContents, _details, authInfo, callback) => {
    if (!authInfo.isProxy) {
      return;
    }
    log('info', 'login event (app)', {
      host: authInfo.host,
      port: authInfo.port,
      scheme: authInfo.scheme,
    });
    if (!credentials) {
      log('warn', 'No credentials configured for live test');
      return;
    }
    event.preventDefault();
    callback(credentials.username, credentials.password);
  });
}

async function resolveChecks(targetSession) {
  const cases = [
    { url: 'https://proxy-target.test/', expect: 'PROXY' },
    { url: 'https://direct-target.test/', expect: 'DIRECT' },
    { url: 'http://127.0.0.1:9487/', expect: 'DIRECT' },
  ];

  for (const testCase of cases) {
    const resolved = await targetSession.resolveProxy(testCase.url);
    const ok = resolved.toUpperCase().includes(testCase.expect);
    log(ok ? 'info' : 'error', 'resolveProxy', {
      url: testCase.url,
      resolved,
      expect: testCase.expect,
      ok,
    });
    if (!ok) {
      throw new Error(`resolveProxy failed for ${testCase.url}: ${resolved}`);
    }
  }
}

async function liveAuthRequest(credentials) {
  const testUrl = process.env.SPIKE_TEST_URL ?? 'https://example.com';
  log('info', 'Live net.request START', { testUrl });

  return new Promise((resolve, reject) => {
    const request = net.request(testUrl);
    request.on('login', (authInfo, callback) => {
      log('info', 'login event (ClientRequest)', {
        isProxy: authInfo.isProxy,
        host: authInfo.host,
        port: authInfo.port,
      });
      if (!authInfo.isProxy || !credentials) {
        callback();
        return;
      }
      callback(credentials.username, credentials.password);
    });
    request.on('response', (response) => {
      log('info', 'Live net.request response', { statusCode: response.statusCode });
      response.resume();
      response.on('end', () => resolve(response.statusCode));
    });
    request.on('error', (error) => {
      log('error', 'Live net.request error', { message: error.message });
      reject(error);
    });
    request.end();
  });
}

async function runSpike() {
  const proxyHost = process.env.SPIKE_PROXY_HOST ?? '10.255.0.1';
  const proxyPort = process.env.SPIKE_PROXY_PORT ?? '8080';
  const proxyType = (process.env.SPIKE_PROXY_TYPE ?? 'http').toLowerCase();
  const credentials =
    process.env.SPIKE_PROXY_USER && process.env.SPIKE_PROXY_PASS
      ? {
          username: process.env.SPIKE_PROXY_USER,
          password: process.env.SPIKE_PROXY_PASS,
        }
      : null;

  registerAppLoginHandler(credentials);

  const pacContent = buildPacScript(proxyHost, proxyPort, proxyType);
  const { server: pacServer, pacUrl } = await startPacServer(pacContent);

  log('info', 'Applying pac_script', { pacUrl });

  try {
    await session.defaultSession.setProxy({
      mode: 'pac_script',
      pacScript: pacUrl,
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    await resolveChecks(session.defaultSession);

    const partition = session.fromPartition('persist:spike-test');
    await partition.setProxy({
      mode: 'pac_script',
      pacScript: pacUrl,
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
    await resolveChecks(partition);
    log('info', 'Partition session PAC resolve OK');

    if (LIVE && credentials) {
      await session.defaultSession.setProxy({
        mode: 'fixed_servers',
        proxyRules: `${proxyType === 'socks5' ? 'socks5' : 'http'}=${proxyHost}:${proxyPort}`,
        proxyBypassRules: '<-loopback>',
      });
      await liveAuthRequest(credentials);
    } else if (LIVE) {
      log('warn', 'Skipping live auth — set SPIKE_PROXY_USER and SPIKE_PROXY_PASS');
    }

    log('info', 'Spike completed successfully');
  } finally {
    pacServer.close();
  }
}

app.whenReady().then(async () => {
  try {
    await runSpike();
    app.exit(0);
  } catch (error) {
    log('error', 'Spike failed', {
      message: error instanceof Error ? error.message : String(error),
    });
    app.exit(1);
  }
});

app.on('window-all-closed', () => {
  app.quit();
});
