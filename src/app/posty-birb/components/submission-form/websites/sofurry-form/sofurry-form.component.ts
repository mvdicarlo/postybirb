import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BaseWebsiteFormComponent } from '../../base-website-form/base-website-form.component';
import { Information } from '../../base-website-form/information.interface';

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
