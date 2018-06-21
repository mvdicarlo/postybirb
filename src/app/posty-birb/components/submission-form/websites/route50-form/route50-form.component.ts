import { Component, Injector, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BaseWebsiteFormComponent } from '../../base-website-form/base-website-form.component';
import { Information } from '../../base-website-form/information.interface';

@Component({
  selector: 'route50-form',
  templateUrl: './route50-form.component.html',
  styleUrls: ['./route50-form.component.css'],
  providers: [{ provide: BaseWebsiteFormComponent, useExisting: forwardRef(() => Route50FormComponent) }]
})
export class Route50FormComponent extends BaseWebsiteFormComponent {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.Route50;

    this.setOptionsForm({});
  }

}
