import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { BaseOptionForm } from '../../base-option-form/base-option-form.component';

@Component({
  selector: 'sofurry-form',
  templateUrl: './sofurry-form.component.html',
  styleUrls: ['./sofurry-form.component.css'],
  providers: [{ provide: BaseOptionForm, useExisting: forwardRef(() => SofurryFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SofurryFormComponent extends BaseOptionForm {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.SoFurry;

    this.setOptionsForm({
      viewOptions: ['0'],
      folder: ['0']
    });
  }

}
