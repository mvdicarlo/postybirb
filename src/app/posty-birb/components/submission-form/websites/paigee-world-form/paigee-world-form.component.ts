import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { BaseWebsiteFormComponent } from '../../base-website-form/base-website-form.component';

@Component({
  selector: 'paigee-world-form',
  templateUrl: './paigee-world-form.component.html',
  styleUrls: ['./paigee-world-form.component.css'],
  providers: [{ provide: BaseWebsiteFormComponent, useExisting: forwardRef(() => PaigeeWorldFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaigeeWorldFormComponent extends BaseWebsiteFormComponent {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.PaigeeWorld;

    this.setOptionsForm({
      category: ["pwgallery"]
    });
  }

}
