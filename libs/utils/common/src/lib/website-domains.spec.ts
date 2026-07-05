import {
  extractHostname,
  mergeDomainLists,
  normalizeDomain,
} from './website-domains';

describe('website-domains', () => {
  it('extractHostname parses https URLs', () => {
    expect(extractHostname('https://www.pixiv.net/path')).toBe('www.pixiv.net');
  });

  it('extractHostname parses host-only values', () => {
    expect(extractHostname('graph.instagram.com')).toBe('graph.instagram.com');
  });

  it('normalizeDomain lowercases and trims trailing dot', () => {
    expect(normalizeDomain('Example.COM.')).toBe('example.com');
  });

  it('mergeDomainLists deduplicates normalized hostnames', () => {
    expect(
      mergeDomainLists(
        ['Pixiv.net', 'pixiv.net'],
        ['BSKY.APP', 'bsky.app'],
      ),
    ).toEqual(['pixiv.net', 'bsky.app']);
  });
});
