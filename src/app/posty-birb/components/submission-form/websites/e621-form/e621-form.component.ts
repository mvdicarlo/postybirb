import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { BaseWebsiteFormComponent } from '../../base-website-form/base-website-form.component';

@Component({
  selector: 'e621-form',
  templateUrl: './e621-form.component.html',
  styleUrls: ['./e621-form.component.css'],
  providers: [{ provide: BaseWebsiteFormComponent, useExisting: forwardRef(() => E621FormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class E621FormComponent extends BaseWebsiteFormComponent {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.e621;

    this.requireValidTags(4);

    this.setOptionsForm({
      sourceURL: ['']
    });
  }

}
