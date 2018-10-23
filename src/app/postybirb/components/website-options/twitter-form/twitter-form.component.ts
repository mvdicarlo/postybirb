import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { BaseOptionForm } from '../../base-option-form/base-option-form.component';

@Component({
  selector: 'twitter-form',
  templateUrl: './twitter-form.component.html',
  styleUrls: ['./twitter-form.component.css'],
  providers: [{ provide: BaseOptionForm, useExisting: forwardRef(() => TwitterFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TwitterFormComponent extends BaseOptionForm {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.Twitter;

    this.setOptionsForm({});
  }

}
