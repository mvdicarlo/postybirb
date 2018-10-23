import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { BaseOptionForm } from '../../base-option-form/base-option-form.component';

@Component({
  selector: 'furiffic-form',
  templateUrl: './furiffic-form.component.html',
  styleUrls: ['./furiffic-form.component.css'],
  providers: [{ provide: BaseOptionForm, useExisting: forwardRef(() => FurifficFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FurifficFormComponent extends BaseOptionForm {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.Furiffic;

    this.setOptionsForm({});
  }

}
