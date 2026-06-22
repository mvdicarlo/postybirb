import {
  collectManagedPartitionIds,
  getInstagramOAuthPartitionId,
  type PartitionEntry,
} from './proxy-partitions';
import { resolveBrowserSessionRoute } from './proxy-route';

const accountEntries: PartitionEntry[] = [
  { partitionId: 'account-1', websiteId: 'pixiv' },
  { partitionId: 'account-2', websiteId: 'instagram' },
];

describe('proxy-route', () => {
  it('uses explicit partition for browser sessions', () => {
    const route = resolveBrowserSessionRoute({ partition: 'account-1' });

    expect(route).toEqual({
      partitionId: 'account-1',
    });
  });

  it('leaves browser sessions on default session when no partition is set', () => {
    const route = resolveBrowserSessionRoute({});

    expect(route).toEqual({
      partitionId: undefined,
    });
  });

  it('collects managed partitions including oauth ids', () => {
    const partitionIds = collectManagedPartitionIds(accountEntries);

    expect(partitionIds).toEqual(
      expect.arrayContaining([
        'account-1',
        'account-2',
        getInstagramOAuthPartitionId('account-2'),
      ]),
    );
  });
});
