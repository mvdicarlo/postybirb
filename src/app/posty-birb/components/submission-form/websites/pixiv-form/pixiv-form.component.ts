import { Component, Injector, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BaseWebsiteFormComponent } from '../../base-website-form/base-website-form.component';
import { Information } from '../../base-website-form/information.interface';

@Component({
  selector: 'pixiv-form',
  templateUrl: './pixiv-form.component.html',
  styleUrls: ['./pixiv-form.component.css'],
  providers: [{ provide: BaseWebsiteFormComponent, useExisting: forwardRef(() => PixivFormComponent) }]
})
export class PixivFormComponent extends BaseWebsiteFormComponent {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.Pixiv;

    this.requireValidTags(1);

    this.setOptionsForm({
      restrictSexual: ['0'],
      communityTags: [false],
      original: [false],
      sexual: [false],
      sexualTypes: []
    });
  }

}
