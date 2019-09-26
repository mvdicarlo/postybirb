import { Component } from '@angular/core';
import { WebsiteRegistry } from '../../registries/website.registry';

@Component({
  selector: 'website-restrictions-dialog',
  templateUrl: './website-restrictions-dialog.component.html',
  styleUrls: ['./website-restrictions-dialog.component.css']
})
export class WebsiteRestrictionsDialog {

  public restrictions: any = {};

  constructor() {
    WebsiteRegistry.getRegisteredAsArray()
      .forEach(registry => {
        this.restrictions[registry.websiteConfig.displayedName] = {
          acceptedFiles: [...(registry.websiteConfig.acceptedFiles || ['*'])].sort(),
          additionalFiles: !!registry.websiteConfig.additionalFiles,
          journals: !!registry.websiteConfig.components.journalForm
        };
      });
  }

}
