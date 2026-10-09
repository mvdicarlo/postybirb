export function isWindows(): boolean {
  return process.platform === 'win32';
}

export function isOSX(): boolean {
  return process.platform === 'darwin';
}

export function isLinux(): boolean {
  return !(isWindows() || isOSX());
}
