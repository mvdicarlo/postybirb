import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BaseWebsiteFormComponent } from '../../base-website-form/base-website-form.component';
import { Information } from '../../base-website-form/information.interface';

@Component({
  selector: 'furiffic-form',
  templateUrl: './furiffic-form.component.html',
  styleUrls: ['./furiffic-form.component.css'],
  providers: [{ provide: BaseWebsiteFormComponent, useExisting: forwardRef(() => FurifficFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FurifficFormComponent extends BaseWebsiteFormComponent {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.Furiffic;

    this.setOptionsForm({});
  }

}
