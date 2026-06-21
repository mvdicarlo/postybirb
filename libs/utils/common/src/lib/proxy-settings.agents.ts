import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import {
  buildProxyAgentUrl,
  type ProxyProfile,
} from './proxy-settings.model';

export type ProxyHttpAgent =
  | SocksProxyAgent
  | HttpProxyAgent<string>
  | HttpsProxyAgent<string>;

export function createProxyAgent(
  profile: ProxyProfile,
  secure: boolean,
): ProxyHttpAgent | null {
  const agentUrl = buildProxyAgentUrl(profile);
  if (!agentUrl) {
    return null;
  }

  if (profile.type === 'socks5') {
    return new SocksProxyAgent(agentUrl);
  }

  return secure
    ? new HttpsProxyAgent(agentUrl)
    : new HttpProxyAgent(agentUrl);
}
