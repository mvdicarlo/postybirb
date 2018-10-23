import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { BaseOptionForm } from '../../base-option-form/base-option-form.component';

@Component({
  selector: 'tumblr-form',
  templateUrl: './tumblr-form.component.html',
  styleUrls: ['./tumblr-form.component.css'],
  providers: [{ provide: BaseOptionForm, useExisting: forwardRef(() => TumblrFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TumblrFormComponent extends BaseOptionForm {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.Tumblr;

    this.setOptionsForm({
      blog: [],
      useTitle: [true]
    });
  }

}
