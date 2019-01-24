import { WebsiteRegistry } from '../registries/website.registry';

export interface WebsiteConfig {
  refreshInterval?: number; // interval at which the app will check status - defaults to 30 minutes
}

export function Website(websiteConfig: WebsiteConfig) {
  if (!websiteConfig.refreshInterval) websiteConfig.refreshInterval = 30 * 60000;
  return (target: any) => {
    WebsiteRegistry.set(target, websiteConfig);
  }
}
