import { Component, Injector, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { BaseWebsiteFormComponent } from '../../base-website-form/base-website-form.component';

@Component({
  selector: 'derpibooru-form',
  templateUrl: './derpibooru-form.component.html',
  styleUrls: ['./derpibooru-form.component.css'],
  providers: [{ provide: BaseWebsiteFormComponent, useExisting: forwardRef(() => DerpibooruFormComponent) }]
})
export class DerpibooruFormComponent extends BaseWebsiteFormComponent {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.Derpibooru;

    this.requireValidTags(3);

    this.setOptionsForm({
      sourceURL: ['']
    });
  }

}
