import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { Validators } from '@angular/forms';
import { BaseWebsiteFormComponent } from '../../base-website-form/base-website-form.component';

@Component({
  selector: 'patreon-form',
  templateUrl: './patreon-form.component.html',
  styleUrls: ['./patreon-form.component.css'],
  providers: [{ provide: BaseWebsiteFormComponent, useExisting: forwardRef(() => PatreonFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
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
