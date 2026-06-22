import { WebsiteId } from '@postybirb/types';

export type PartitionEntry = {
  partitionId: string;
  websiteId: WebsiteId;
};

export const INSTAGRAM_OAUTH_PARTITION_PREFIX = 'instagram-oauth-';

export function getInstagramOAuthPartitionId(accountId: string): string {
  return `${INSTAGRAM_OAUTH_PARTITION_PREFIX}${accountId}`;
}

export function isInstagramOAuthPartition(partitionId: string): boolean {
  return partitionId.startsWith(INSTAGRAM_OAUTH_PARTITION_PREFIX);
}

export function collectManagedPartitionIds(
  accountEntries: PartitionEntry[],
): string[] {
  const ids = new Set<string>();

  for (const entry of accountEntries) {
    ids.add(entry.partitionId);
    if (entry.websiteId === 'instagram') {
      ids.add(getInstagramOAuthPartitionId(entry.partitionId));
    }
  }

  return [...ids];
}
