import { createProxyAgent } from './proxy-agents';

describe('createProxyAgent', () => {
  it('returns null for disabled profiles', () => {
    expect(
      createProxyAgent(
        {
          id: 'disabled',
          enabled: false,
          type: 'http',
          host: 'proxy.example.com',
          port: '8080',
          username: '',
          password: '',
        },
        true,
      ),
    ).toBeNull();
  });

  it('creates an agent for enabled HTTP profiles', () => {
    expect(
      createProxyAgent(
        {
          id: 'http-profile',
          enabled: true,
          type: 'http',
          host: 'proxy.example.com',
          port: '8080',
          username: '',
          password: '',
        },
        true,
      ),
    ).not.toBeNull();
  });
});
