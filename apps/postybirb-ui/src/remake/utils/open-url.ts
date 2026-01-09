import { isElectron } from './environment';

export function openUrl(url: string): void {
  if (isElectron()) {
    window.electron.openExternalLink(url);
  } else {
    window.open(url, '_blank');
  }
}
