import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { BaseWebsiteFormComponent } from '../../base-website-form/base-website-form.component';

@Component({
  selector: 'sofurry-form',
  templateUrl: './sofurry-form.component.html',
  styleUrls: ['./sofurry-form.component.css'],
  providers: [{ provide: BaseWebsiteFormComponent, useExisting: forwardRef(() => SofurryFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SofurryFormComponent extends BaseWebsiteFormComponent {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.SoFurry;

    this.requireValidTags(2);

    this.setOptionsForm({
      viewOptions: ['0'],
      folder: ['0']
    });
  }

}
