/**
 * https://www.electronjs.org/docs/api/session#sessionfrompartitionpartition-options
 *
 * @param {string} partitionId
 * @return {*}  {string}
 */
export function getPartitionKey(partitionId: string): string {
  return `persist:${partitionId}`;
}

export function isWindows(): boolean {
  return process.platform === 'win32';
}

export function isOSX(): boolean {
  return process.platform === 'darwin';
}

export function isLinux(): boolean {
  return !(isWindows() || isOSX());
}
