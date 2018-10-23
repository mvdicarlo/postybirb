import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { Validators } from '@angular/forms';
import { BaseOptionForm } from '../../base-option-form/base-option-form.component';

@Component({
  selector: 'patreon-form',
  templateUrl: './patreon-form.component.html',
  styleUrls: ['./patreon-form.component.css'],
  providers: [{ provide: BaseOptionForm, useExisting: forwardRef(() => PatreonFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatreonFormComponent extends BaseOptionForm {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.Patreon;

    this.setOptionsForm({
      minimumDollarsToView: [0, Validators.min(0)],
      chargePatrons: [false],
      patronsOnly: [false],
      schedule: [null]
    });
  }

}
