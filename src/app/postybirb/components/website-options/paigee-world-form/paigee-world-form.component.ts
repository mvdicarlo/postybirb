import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { BaseOptionForm } from '../../base-option-form/base-option-form.component';

@Component({
  selector: 'paigee-world-form',
  templateUrl: './paigee-world-form.component.html',
  styleUrls: ['./paigee-world-form.component.css'],
  providers: [{ provide: BaseOptionForm, useExisting: forwardRef(() => PaigeeWorldFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaigeeWorldFormComponent extends BaseOptionForm {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.PaigeeWorld;

    this.setOptionsForm({
      category: ["pwgallery"]
    });
  }

}
