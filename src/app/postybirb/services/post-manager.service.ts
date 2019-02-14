import { Injectable, Injector } from '@angular/core';
import { Submission } from 'src/app/database/models/submission.model';
import { WebsiteService } from 'src/app/websites/interfaces/website-service.interface';
import { WebsiteRegistry, WebsiteRegistryEntry } from 'src/app/websites/registries/website.registry';

@Injectable({
  providedIn: 'root'
})
export class PostManagerService {
  private serviceMap: Map<string, WebsiteService> = new Map();

  constructor(injector: Injector) {
    const registries: WebsiteRegistryEntry = WebsiteRegistry.getRegistered();
    Object.keys(registries).forEach(key => {
      const registry = registries[key];
      this.serviceMap.set(registry.name, injector.get(registry.class));
    });
  }

  public post(website: string, submissionToPost: Submission): Promise<any> {
    return new Promise((resolve, reject) => {
      setTimeout(resolve , 2000)
    });
  }
}
