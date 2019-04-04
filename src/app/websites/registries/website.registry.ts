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

  public static getRegisteredAsArray(): WebsiteRegistryConfig[] {
    const arr: WebsiteRegistryConfig[] = [];
    WebsiteRegistry.registeredWebsites.forEach((value, key) => arr.push(value));
    return arr;
  }

  public static getConfigForRegistry(name: string): WebsiteRegistryConfig {
    return this.registeredWebsites.get(name);
  }

  public static set(service: Function, config: WebsiteConfig): void {
    Object.freeze(config);
    WebsiteRegistry.registeredWebsites.set(service.name, {
      websiteConfig: config,
      name: service.name,
      class: service
    });
  }
}
