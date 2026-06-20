import { ProxyProfile } from '@postybirb/utils/common';
import {
  collectManagedPartitionIds,
  getHeadlessWebsitePartitionId,
  getInstagramOAuthPartitionId,
  resolveWebsiteFromPartition,
} from './proxy-partitions';

describe('proxy-partitions', () => {
  it('derives headless website partition ids', () => {
    expect(getHeadlessWebsitePartitionId('discord')).toBe(
      'headless-website-discord',
    );
  });

  it('resolves headless partitions back to website ids', () => {
    const partitionId = getHeadlessWebsitePartitionId('discord');
    expect(resolveWebsiteFromPartition(partitionId, [])).toBe('discord');
  });

  it('collects oauth partitions for instagram accounts', () => {
    const ids = collectManagedPartitionIds(
      [{ partitionId: 'acc-1', websiteId: 'instagram' }],
      ['discord'],
    );

    expect(ids).toEqual(
      expect.arrayContaining([
        'acc-1',
        getInstagramOAuthPartitionId('acc-1'),
        getHeadlessWebsitePartitionId('discord'),
      ]),
    );
  });
});
