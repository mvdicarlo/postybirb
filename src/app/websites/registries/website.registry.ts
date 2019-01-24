import { WebsiteConfig } from '../decorators/website-decorator';

export interface RegistryConfig {
  config: WebsiteConfig;
  name: string;
  class: Function;
}

export class WebsiteRegistry {
  private static readonly registeredWebsites: Map<string, RegistryConfig> = new Map();

  public static getRegistered(): {[key: string]: RegistryConfig} {
    const objMap: {[key: string]: any} = {};
    WebsiteRegistry.registeredWebsites.forEach((value, key) => objMap[key] = value);
    return objMap;
  }

  public static set(service: Function, config: WebsiteConfig): void {
    console.info('Registered', service.name, config);
    Object.freeze(config)
    WebsiteRegistry.registeredWebsites.set(service.name, {
      config,
      name: service.name,
      class: service
    });
  }
}
