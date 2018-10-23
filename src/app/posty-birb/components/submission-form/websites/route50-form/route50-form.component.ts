import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { BaseWebsiteFormComponent } from '../../base-website-form/base-website-form.component';

@Component({
  selector: 'route50-form',
  templateUrl: './route50-form.component.html',
  styleUrls: ['./route50-form.component.css'],
  providers: [{ provide: BaseWebsiteFormComponent, useExisting: forwardRef(() => Route50FormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Route50FormComponent extends BaseWebsiteFormComponent {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.Route50;

    this.setOptionsForm({});
  }

}
