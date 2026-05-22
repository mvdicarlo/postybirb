/**
 * Builds the persistent partition key used to isolate per-account data
 * (cookies, storage, etc.) across runtimes.
 *
 * Format matches Electron's session.fromPartition convention:
 * https://www.electronjs.org/docs/api/session#sessionfrompartitionpartition-options
 *
 * @param partitionId Unique account / session identifier.
 */
export function getPartitionKey(partitionId: string): string {
  return `persist:${partitionId}`;
}
