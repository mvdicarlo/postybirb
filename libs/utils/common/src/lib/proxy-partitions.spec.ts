import { collectManagedPartitionIds } from './proxy-partitions';

describe('proxy-partitions', () => {
  it('collects oauth partitions for instagram accounts', () => {
    const ids = collectManagedPartitionIds([
      { partitionId: 'acc-1', websiteId: 'instagram' },
    ]);

    expect(ids).toEqual(
      expect.arrayContaining(['acc-1', 'instagram-oauth-acc-1']),
    );
  });

  it('collects managed partitions for mixed accounts', () => {
    const ids = collectManagedPartitionIds([
      { partitionId: 'account-1', websiteId: 'pixiv' },
      { partitionId: 'account-2', websiteId: 'instagram' },
    ]);

    expect(ids).toEqual(
      expect.arrayContaining([
        'account-1',
        'account-2',
        'instagram-oauth-account-2',
      ]),
    );
  });
});
