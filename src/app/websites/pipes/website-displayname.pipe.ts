import { Pipe, PipeTransform } from '@angular/core';
import { WebsiteRegistry } from '../registries/website.registry';

@Pipe({
  name: 'websiteDisplayname'
})
export class WebsiteDisplaynamePipe implements PipeTransform {

  transform(website: any): any {
    return WebsiteRegistry.getConfigForRegistry(website).websiteConfig.displayedName;
  }

}
