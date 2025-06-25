export function isElectronEnvironment(): boolean {
  return window.electron !== undefined;
}
