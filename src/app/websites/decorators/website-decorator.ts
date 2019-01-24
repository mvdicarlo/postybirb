import { WebsiteRegistry } from '../registries/website.registry';

export interface WebsiteConfig {
  refreshInterval?: number;     // interval at which the app will check status [default=30 minutes]
  displayedName?: string        // name value that is displayed in the UI to the user [default=constructor name]
}

export function Website(websiteConfig: WebsiteConfig) {
  if (!websiteConfig.refreshInterval) websiteConfig.refreshInterval = 30 * 60000;
  return (target: Function) => {
    if (!websiteConfig.displayedName) websiteConfig.displayedName = target.name;
    WebsiteRegistry.set(target, websiteConfig);
  }
}
