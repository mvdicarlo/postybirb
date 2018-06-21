import { Component, Injector, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, Validators } from '@angular/forms';
import { BaseWebsiteFormComponent } from '../../base-website-form/base-website-form.component';
import { Information } from '../../base-website-form/information.interface';

@Component({
  selector: 'patreon-form',
  templateUrl: './patreon-form.component.html',
  styleUrls: ['./patreon-form.component.css'],
  providers: [{ provide: BaseWebsiteFormComponent, useExisting: forwardRef(() => PatreonFormComponent) }]
})
export class PatreonFormComponent extends BaseWebsiteFormComponent {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.Patreon;

    this.setOptionsForm({
      minimumDollarsToView: [0, Validators.min(0)],
      chargePatrons: [false]
    });
  }

}
