import { Component, Injector, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BaseWebsiteFormComponent } from '../../base-website-form/base-website-form.component';
import { Information } from '../../base-website-form/information.interface';

@Component({
  selector: 'twitter-form',
  templateUrl: './twitter-form.component.html',
  styleUrls: ['./twitter-form.component.css'],
  providers: [{ provide: BaseWebsiteFormComponent, useExisting: forwardRef(() => TwitterFormComponent) }]

})
export class TwitterFormComponent extends BaseWebsiteFormComponent {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.Twitter;

    this.setOptionsForm({});
  }

}
