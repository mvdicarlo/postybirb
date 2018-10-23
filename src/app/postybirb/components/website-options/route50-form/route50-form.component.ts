import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { BaseOptionForm } from '../../base-option-form/base-option-form.component';

@Component({
  selector: 'route50-form',
  templateUrl: './route50-form.component.html',
  styleUrls: ['./route50-form.component.css'],
  providers: [{ provide: BaseOptionForm, useExisting: forwardRef(() => Route50FormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Route50FormComponent extends BaseOptionForm {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.Route50;

    this.setOptionsForm({});
  }

}
