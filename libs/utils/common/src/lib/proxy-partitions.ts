import { WebsiteId } from '@postybirb/types';

export type PartitionEntry = {
  partitionId: string;
  websiteId: WebsiteId;
};

export function collectManagedPartitionIds(
  accountEntries: PartitionEntry[],
): string[] {
  const ids = new Set<string>();

  for (const entry of accountEntries) {
    ids.add(entry.partitionId);
    if (entry.websiteId === 'instagram') {
      ids.add(`instagram-oauth-${entry.partitionId}`);
    }
  }

  return [...ids];
}
