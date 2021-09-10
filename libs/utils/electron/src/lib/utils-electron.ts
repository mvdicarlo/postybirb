/**
 * https://www.electronjs.org/docs/api/session#sessionfrompartitionpartition-options
 *
 * @param {string} partitionId
 * @return {*}  {string}
 */
export function getPartitionKey(partitionId: string): string {
  return `persist:${partitionId}`;
}
