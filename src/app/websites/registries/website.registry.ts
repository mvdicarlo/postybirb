import { WebsiteConfig } from '../decorators/website-decorator';

export interface WebsiteRegistryConfig {
  websiteConfig: WebsiteConfig;
  name: string;
  class: Function;
}

export interface WebsiteRegistryEntry {
  [key: string]: WebsiteRegistryConfig
}

export class WebsiteRegistry {
  private static readonly registeredWebsites: Map<string, WebsiteRegistryConfig> = new Map();

  public static getRegistered(): WebsiteRegistryEntry {
    const objMap: WebsiteRegistryEntry = {};
    WebsiteRegistry.registeredWebsites.forEach((value, key) => objMap[key] = value);
    return objMap;
  }

  public static set(service: Function, config: WebsiteConfig): void {
    console.info('Registered', service.name, config);
    Object.freeze(config)
    WebsiteRegistry.registeredWebsites.set(service.name, {
      websiteConfig: config,
      name: service.name,
      class: service
    });
  }
}
