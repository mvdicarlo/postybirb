// Electron has its own network stack with excellent proxy support
// Nodejs has its own stack without it, and thus we need to patch fetch
// and axios to use network stack instead
// @postybirb/http library uses electron network stack so no additional
// configuration there is required

// To configure proxy use electron proxy settings (env or command line)

import { app, net, session } from 'electron';

import http from 'node:http';
import nodeNet from 'node:net';
import nodeTLS from 'node:tls';

import { Agent, AgentConnectOpts } from 'agent-base';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

// eslint-disable-next-line import/no-extraneous-dependencies
import axios from 'axios';
import { format } from 'node:url';

// Monkey-patch global fetch to use electron-fetch
global.fetch = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => net.fetch(input.toString(), init);

export async function getParsedProxiesFor(url: string) {
  const proxySources = await session.defaultSession.resolveProxy(url);
  if (proxySources === 'DIRECT') return [];

  // proxyUrl Example:
  // PROXY 127.0.0.1:2080; DIRECT
  // SOCKS 127.0.0.1:1080; PROXY 127.0.0.1:1010; DIRECT
  const types = proxySources
    .split(';')
    .map((section) => {
      try {
        const [type, proxyUrl] = section.split(' ', 2);
        const parsed = new URL(
          proxyUrl.includes('://') ? proxyUrl : `scheme://${proxyUrl}`,
        );
        return { type, hostname: parsed.hostname, port: parsed.port };
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(
          'Parsing proxy failed',
          error,
          'proxySources',
          proxySources,
          'section',
          section,
        );
        return false;
      }
    })
    .filter((e) => e !== false);

  return types as ((typeof types)[number] | undefined)[];
}

class ElectronProxyAgent extends Agent {
  private agentsCache = new Map<string, Agent>();

  async connect(req: http.ClientRequest, options: AgentConnectOpts) {
    const secure = options.secureEndpoint;

    // It includes only the first part of the url, excluding path and search params
    const url = format(req);

    let agent = this.agentsCache.get(url);
    if (!agent) {
      agent = await this.getAgent(url, secure);
      this.agentsCache.set(url, agent);
    }

    return agent.connect(req, options);
  }

  private async getAgent(url: string, secure: boolean): Promise<Agent> {
    const proxy = (await getParsedProxiesFor(url))[0];
    const type = proxy?.type ?? 'DIRECT';
    const proxyHostname = proxy?.hostname;

    switch (type) {
      case 'DIRECT':
        if (secure) return nodeTLS as unknown as Agent;
        return nodeNet as unknown as Agent;

      case 'SOCKS':
      case 'SOCKS5':
        return new SocksProxyAgent(`socks://${proxyHostname}`);

      case 'PROXY':
      case 'HTTPS': {
        const proxyURL = `${type === 'HTTPS' ? 'https' : 'http'}://${proxyHostname}`;
        if (secure) return new HttpsProxyAgent(proxyURL);
        return new HttpProxyAgent(proxyURL);
      }
      default:
        throw new Error(`Unknown proxy type: ${type}`);
    }
  }
}

app.on('ready', () => {
  // Configure axios default instance
  const httpsAgent = new ElectronProxyAgent();

  axios.defaults.httpAgent = httpsAgent;
  axios.defaults.httpsAgent = httpsAgent;
});
