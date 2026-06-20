import { WebsiteId } from '@postybirb/types';

export type PartitionEntry = {
  partitionId: string;
  websiteId: WebsiteId;
};

/** Ephemeral Chromium session for headless BrowserWindow proxy (Cloudflare bypass). */
export const HEADLESS_WEBSITE_PARTITION_PREFIX = 'headless-website-';

export const INSTAGRAM_OAUTH_PARTITION_PREFIX = 'instagram-oauth-';

export function getHeadlessWebsitePartitionId(websiteId: string): string {
  return `${HEADLESS_WEBSITE_PARTITION_PREFIX}${websiteId}`;
}

export function isHeadlessWebsitePartition(partitionId: string): boolean {
  return partitionId.startsWith(HEADLESS_WEBSITE_PARTITION_PREFIX);
}

export function websiteIdFromHeadlessPartition(
  partitionId: string,
): WebsiteId | null {
  if (!isHeadlessWebsitePartition(partitionId)) {
    return null;
  }

  return partitionId.slice(
    HEADLESS_WEBSITE_PARTITION_PREFIX.length,
  ) as WebsiteId;
}

export function getInstagramOAuthPartitionId(accountId: string): string {
  return `${INSTAGRAM_OAUTH_PARTITION_PREFIX}${accountId}`;
}

export function isInstagramOAuthPartition(partitionId: string): boolean {
  return partitionId.startsWith(INSTAGRAM_OAUTH_PARTITION_PREFIX);
}

/**
 * Maps a logical partition id to the website whose proxy profile should apply.
 */
export function resolveWebsiteFromPartition(
  partitionId: string,
  accountEntries: PartitionEntry[],
): WebsiteId | null {
  if (!partitionId?.trim()) {
    return null;
  }

  if (isInstagramOAuthPartition(partitionId)) {
    return 'instagram';
  }

  const headlessWebsiteId = websiteIdFromHeadlessPartition(partitionId);
  if (headlessWebsiteId) {
    return headlessWebsiteId;
  }

  return (
    accountEntries.find((entry) => entry.partitionId === partitionId)
      ?.websiteId ?? null
  );
}

/**
 * All partition ids that should be refreshed when proxy settings change.
 */
export function collectManagedPartitionIds(
  accountEntries: PartitionEntry[],
  websiteIdsWithProfiles: string[],
): string[] {
  const ids = new Set<string>();

  for (const entry of accountEntries) {
    ids.add(entry.partitionId);
    if (entry.websiteId === 'instagram') {
      ids.add(getInstagramOAuthPartitionId(entry.partitionId));
    }
  }

  for (const websiteId of websiteIdsWithProfiles) {
    ids.add(getHeadlessWebsitePartitionId(websiteId));
  }

  return [...ids];
}
