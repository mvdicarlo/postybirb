export type ProxyType = 'http' | 'socks5';

export type ProxyMode = 'system' | 'direct' | 'fixed_servers' | 'pac_routing';

export type ProxyPoolEntry = {
  id: string;
  label?: string;
  type: ProxyType;
  host: string;
  port: string;
  username: string;
  password: string;
};

export type WebsiteProxyChoice = 'direct' | 'system' | string;

export type ProxyConfiguration = {
  mode: ProxyMode;
  pool: ProxyPoolEntry[];
  fixedProxyId?: string;
  routing: Record<string, WebsiteProxyChoice>;
  pacAccessToken?: string;
};

export type ProxyProfile = ProxyPoolEntry & {
  enabled: boolean;
  websites: string[];
};

export type ValidateProxyConfigurationResult = {
  ok: boolean;
  errors: string[];
};
