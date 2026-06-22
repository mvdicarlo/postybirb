import {
  collectManagedPartitionIds,
  getInstagramOAuthPartitionId,
} from './proxy-partitions';

describe('proxy-partitions', () => {
  it('collects oauth partitions for instagram accounts', () => {
    const ids = collectManagedPartitionIds([
      { partitionId: 'acc-1', websiteId: 'instagram' },
    ]);

    expect(ids).toEqual(
      expect.arrayContaining([
        'acc-1',
        getInstagramOAuthPartitionId('acc-1'),
      ]),
    );
  });
});
