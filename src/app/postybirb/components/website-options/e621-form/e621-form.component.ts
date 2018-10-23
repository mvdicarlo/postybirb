import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { BaseOptionForm } from '../../base-option-form/base-option-form.component';


@Component({
  selector: 'e621-form',
  templateUrl: './e621-form.component.html',
  styleUrls: ['./e621-form.component.css'],
  providers: [{ provide: BaseOptionForm, useExisting: forwardRef(() => E621FormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class E621FormComponent extends BaseOptionForm {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.e621;

    this.setOptionsForm({
      sourceURL: ['']
    });
  }

}
