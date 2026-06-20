import {
  ProxyConfiguration,
  ProxyProfile,
} from '@postybirb/utils/common';
import {
  collectManagedPartitionIds,
  getHeadlessWebsitePartitionId,
  getInstagramOAuthPartitionId,
  resolveWebsiteFromPartition,
  type PartitionEntry,
} from './proxy-partitions';
import {
  collectWebsiteIdsWithEnabledProfiles,
  createPartitionWebsiteResolver,
  resolveBrowserSessionRoute,
  resolveHttpRoute,
} from './proxy-route';

const discordProfile: ProxyProfile = {
  id: 'discord-profile',
  enabled: true,
  type: 'http',
  host: '127.0.0.1',
  port: '8080',
  username: '',
  password: '',
  websites: ['discord'],
  label: 'Discord',
};

const pixivProfile: ProxyProfile = {
  id: 'pixiv-profile',
  enabled: true,
  type: 'http',
  host: '127.0.0.1',
  port: '9090',
  username: '',
  password: '',
  websites: ['pixiv'],
  label: 'Pixiv',
};

const configuration: ProxyConfiguration = {
  profiles: [discordProfile, pixivProfile],
};

const accountEntries: PartitionEntry[] = [
  { partitionId: 'account-1', websiteId: 'pixiv' },
  { partitionId: 'account-2', websiteId: 'instagram' },
];

describe('proxy-route', () => {
  const resolvePartitionWebsite =
    createPartitionWebsiteResolver(accountEntries);

  it('routes partition-bound Http through chromium-session', () => {
    const route = resolveHttpRoute(
      { partition: 'account-1' },
      resolvePartitionWebsite,
      configuration,
    );

    expect(route).toEqual({
      transport: 'chromium-session',
      partitionId: 'account-1',
      profile: pixivProfile,
    });
  });

  it('routes partition-less website Http through node-agent', () => {
    const route = resolveHttpRoute(
      { websiteId: 'discord' },
      resolvePartitionWebsite,
      configuration,
    );

    expect(route).toEqual({
      transport: 'node-agent',
      profile: discordProfile,
    });
  });

  it('falls back to system when no profile matches', () => {
    const route = resolveHttpRoute(
      { websiteId: 'furaffinity' },
      resolvePartitionWebsite,
      configuration,
    );

    expect(route).toEqual({ transport: 'system' });
  });

  it('creates headless website partition for browser-only traffic', () => {
    const route = resolveBrowserSessionRoute(
      { websiteId: 'discord' },
      resolvePartitionWebsite,
      configuration,
    );

    expect(route).toEqual({
      partitionId: getHeadlessWebsitePartitionId('discord'),
      profile: discordProfile,
    });
  });

  it('resolves instagram oauth partitions to instagram profile', () => {
    const oauthPartition = getInstagramOAuthPartitionId('account-2');
    const websiteId = resolveWebsiteFromPartition(oauthPartition, accountEntries);

    expect(websiteId).toBe('instagram');

    const route = resolveHttpRoute(
      { partition: oauthPartition },
      createPartitionWebsiteResolver(accountEntries),
      {
        profiles: [
          {
            ...pixivProfile,
            websites: ['instagram'],
            id: 'ig-profile',
          },
        ],
      },
    );

    expect(route.transport).toBe('chromium-session');
    if (route.transport === 'chromium-session') {
      expect(route.profile?.id).toBe('ig-profile');
    }
  });

  it('collects managed partitions including oauth and headless ids', () => {
    const websiteIds = collectWebsiteIdsWithEnabledProfiles(configuration);
    const partitionIds = collectManagedPartitionIds(
      accountEntries,
      websiteIds,
    );

    expect(partitionIds).toEqual(
      expect.arrayContaining([
        'account-1',
        'account-2',
        getInstagramOAuthPartitionId('account-2'),
        getHeadlessWebsitePartitionId('discord'),
        getHeadlessWebsitePartitionId('pixiv'),
      ]),
    );
  });
});
