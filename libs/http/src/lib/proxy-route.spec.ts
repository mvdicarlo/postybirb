import {
  collectManagedPartitionIds,
  getInstagramOAuthPartitionId,
  resolveWebsiteFromPartition,
  type PartitionEntry,
} from './proxy-partitions';
import { resolveBrowserSessionRoute, resolveHttpRoute } from './proxy-route';

const accountEntries: PartitionEntry[] = [
  { partitionId: 'account-1', websiteId: 'pixiv' },
  { partitionId: 'account-2', websiteId: 'instagram' },
];

describe('proxy-route', () => {
  it('routes partition-bound Http through chromium-session', () => {
    const route = resolveHttpRoute({ partition: 'account-1' });

    expect(route).toEqual({
      transport: 'chromium-session',
      partitionId: 'account-1',
    });
  });

  it('routes partition-less Http through default session rules', () => {
    const route = resolveHttpRoute({ websiteId: 'discord' });

    expect(route).toEqual({ transport: 'system' });
  });

  it('uses explicit partition for browser sessions', () => {
    const route = resolveBrowserSessionRoute({ partition: 'account-1' });

    expect(route).toEqual({
      partitionId: 'account-1',
    });
  });

  it('leaves browser sessions on default session when no partition is set', () => {
    const route = resolveBrowserSessionRoute({ websiteId: 'discord' });

    expect(route).toEqual({
      partitionId: undefined,
    });
  });

  it('resolves instagram oauth partitions to instagram', () => {
    const oauthPartition = getInstagramOAuthPartitionId('account-2');
    const websiteId = resolveWebsiteFromPartition(oauthPartition, accountEntries);

    expect(websiteId).toBe('instagram');

    const route = resolveHttpRoute({ partition: oauthPartition });
    expect(route).toEqual({
      transport: 'chromium-session',
      partitionId: oauthPartition,
    });
  });

  it('collects managed partitions including oauth ids', () => {
    const partitionIds = collectManagedPartitionIds(accountEntries, ['pixiv']);

    expect(partitionIds).toEqual(
      expect.arrayContaining([
        'account-1',
        'account-2',
        getInstagramOAuthPartitionId('account-2'),
      ]),
    );
  });
});
